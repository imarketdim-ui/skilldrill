// Sends Web Push notifications.
//
// SECURITY MODEL
// --------------
// This function MUST NOT trust an arbitrary `user_ids` list from a browser
// session. There are two legitimate callers:
//
//   1. Internal trusted server-to-server call (other edge functions like
//      `send-broadcast`, `tinkoff-webhook`, schedulers) authenticated with
//      the SERVICE ROLE key. They may broadcast to any list of users.
//
//   2. Direct user call from the SPA. Such a caller may only push:
//        a) to themselves (self-notifications), or
//        b) to a single conversation peer they are actively chatting with —
//           proven by the existence of at least one chat_messages row with
//           recipient = caller AND sender = target (the peer wrote them
//           first), or vice versa within the same chat thread.
//      Anything else is rejected.
//
// Subscriptions invalidated by the push provider (HTTP 404/410) are
// deactivated only for the specific endpoint, never for the whole user.

import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-internal-call',
};

interface PushPayload {
  user_ids: string[];
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY');
    const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY');
    const VAPID_SUBJECT =
      Deno.env.get('VAPID_SUBJECT') || 'mailto:noreply@skillspot.app';
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return json(500, { error: 'VAPID keys not configured' });
    }

    // ---- Parse + validate body ----
    let body: PushPayload;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: 'Invalid JSON' });
    }

    if (
      !Array.isArray(body.user_ids) ||
      body.user_ids.length === 0 ||
      body.user_ids.length > 5000 ||
      !body.title ||
      !body.body ||
      typeof body.title !== 'string' ||
      typeof body.body !== 'string'
    ) {
      return json(400, { error: 'user_ids[], title, body are required' });
    }

    const targetIds = Array.from(
      new Set(body.user_ids.filter((s) => typeof s === 'string' && s.length > 0)),
    );
    if (targetIds.length === 0) return json(400, { error: 'No valid user_ids' });

    // ---- Authorization ----
    const authHeader = req.headers.get('Authorization') || '';
    const bearer = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : '';

    // Accept service-role bearer as a "trusted internal" caller.
    const isInternalCall = bearer.length > 0 && bearer === SERVICE_ROLE;

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);

    if (!isInternalCall) {
      // Direct user call — must be authenticated.
      if (!bearer) return json(401, { error: 'Unauthorized' });

      const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser(bearer);
      if (userErr || !userData?.user?.id) {
        return json(401, { error: 'Unauthorized' });
      }
      const callerId = userData.user.id;

      // Allowed: pushing to yourself.
      const onlySelf = targetIds.length === 1 && targetIds[0] === callerId;

      if (!onlySelf) {
        // Allowed: pushing to peers the caller has chatted with.
        // Pull all peer ids that have an existing chat with caller.
        const { data: peerRows, error: peerErr } = await adminClient
          .from('chat_messages')
          .select('sender_id, recipient_id')
          .or(`sender_id.eq.${callerId},recipient_id.eq.${callerId}`)
          .limit(2000);

        if (peerErr) {
          console.error('[send-push] peer lookup failed', peerErr);
          return json(500, { error: 'Authorization lookup failed' });
        }

        const allowedPeers = new Set<string>();
        for (const r of peerRows || []) {
          if (r.sender_id && r.sender_id !== callerId) allowedPeers.add(r.sender_id);
          if (r.recipient_id && r.recipient_id !== callerId) {
            allowedPeers.add(r.recipient_id);
          }
        }
        // The caller may always push to themselves too.
        allowedPeers.add(callerId);

        const forbidden = targetIds.filter((id) => !allowedPeers.has(id));
        if (forbidden.length > 0) {
          return json(403, {
            error: 'Forbidden: cannot push to users you have not interacted with',
            forbidden_count: forbidden.length,
          });
        }
      }
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

    // ---- Fetch active subscriptions ----
    const { data: subs, error: subsErr } = await adminClient
      .from('push_subscriptions')
      .select('user_id, endpoint, keys')
      .in('user_id', targetIds)
      .eq('is_active', true);

    if (subsErr) {
      console.error('[send-push] subs fetch failed', subsErr);
      return json(500, { error: 'Subscription lookup failed' });
    }

    if (!subs?.length) {
      return json(200, { sent: 0, failed: 0, total: 0, message: 'No active subscriptions' });
    }

    const payload = JSON.stringify({
      title: body.title,
      body: body.body,
      url: body.url || '/',
      tag: body.tag || 'skillspot',
    });

    let sent = 0;
    let failed = 0;
    await Promise.all(
      subs.map(async (s: any) => {
        try {
          const keys = typeof s.keys === 'string' ? JSON.parse(s.keys) : s.keys;
          await webpush.sendNotification({ endpoint: s.endpoint, keys }, payload);
          sent++;
        } catch (e: any) {
          failed++;
          // Deactivate ONLY this endpoint, not all subscriptions for the user.
          if (e?.statusCode === 410 || e?.statusCode === 404) {
            await adminClient
              .from('push_subscriptions')
              .update({ is_active: false, updated_at: new Date().toISOString() })
              .eq('endpoint', s.endpoint);
          } else {
            console.error('[send-push] delivery error', { endpoint: s.endpoint, code: e?.statusCode, msg: e?.body || e?.message });
          }
        }
      }),
    );

    return json(200, { sent, failed, total: subs.length });
  } catch (err: any) {
    console.error('[send-push] unexpected', err);
    return json(500, { error: err?.message || 'unknown' });
  }
});
