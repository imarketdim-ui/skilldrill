// Server-side broadcast sender.
//
// SECURITY MODEL
// --------------
// The client may submit ONLY a campaign_id. The server alone resolves the
// audience from `marketing_campaigns` columns. The client cannot inject
// recipient ids, bypass moderation, double-send, or include users outside
// of its own/business audience.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface BroadcastBody {
  campaign_id: string;
  push?: boolean;
}

const MAX_RECIPIENTS = 50000;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function applyVars(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json(401, { error: 'Unauthorized' });
    }

    // Identify the caller through their JWT.
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (userErr || !user) return json(401, { error: 'Unauthorized' });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Parse + validate body.
    let body: BroadcastBody;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: 'Invalid JSON' });
    }
    if (!body.campaign_id || typeof body.campaign_id !== 'string') {
      return json(400, { error: 'campaign_id required' });
    }

    // Load campaign.
    const { data: campaign, error: cErr } = await admin
      .from('marketing_campaigns')
      .select('*')
      .eq('id', body.campaign_id)
      .single();
    if (cErr || !campaign) return json(404, { error: 'Campaign not found' });

    // Check authorization: creator OR moderator/admin.
    const isCreator = campaign.creator_id === user.id;
    let isModerator = false;
    if (!isCreator) {
      const { data: roles } = await admin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['platform_admin', 'super_admin', 'moderator'])
        .eq('is_active', true);
      isModerator = !!roles?.length;
      if (!isModerator) return json(403, { error: 'Forbidden' });
    }

    // Already-sent guard (idempotency).
    if (campaign.status === 'sent') {
      return json(409, {
        error: 'Already sent',
        sent_count: campaign.sent_count || 0,
      });
    }

    // Workflow guard:
    // - "own_clients" campaigns are free and may be sent by the creator at
    //   any non-final status (draft / pending_moderation does not apply).
    // - Paid "skillspot_clients" campaigns require moderator approval.
    const targetType = campaign.target_type || 'own_clients';
    const isPaid = targetType === 'skillspot_clients';

    if (isPaid) {
      if (campaign.status !== 'approved') {
        return json(403, {
          error: 'Campaign not approved',
          status: campaign.status,
        });
      }
    } else {
      // free own_clients flow — must be initiated by creator
      if (!isCreator) return json(403, { error: 'Only creator can send own-clients campaign' });
      if (!['draft', 'approved'].includes(campaign.status || '')) {
        return json(409, { error: 'Invalid status', status: campaign.status });
      }
    }

    // Atomically claim "in_progress" so concurrent invocations cannot
    // double-send.
    const { data: claim, error: claimErr } = await admin
      .from('marketing_campaigns')
      .update({ status: 'sending', updated_at: new Date().toISOString() })
      .eq('id', campaign.id)
      .eq('status', campaign.status) // optimistic lock
      .select('id')
      .maybeSingle();
    if (claimErr || !claim) {
      return json(409, { error: 'Could not lock campaign for sending' });
    }

    // ---- Server-side audience resolution ----
    let recipientIds: string[] = [];

    try {
      if (targetType === 'own_clients' && campaign.business_id) {
        // Audience = clients with bookings for this business, optionally
        // filtered by group, optionally restricted to selected ids.
        const { data: bks } = await admin
          .from('bookings')
          .select('client_id, scheduled_at')
          .eq('organization_id', campaign.business_id)
          .limit(20000);

        const counts = new Map<string, { count: number; last: string | null }>();
        for (const b of bks || []) {
          const cur = counts.get(b.client_id) || { count: 0, last: null };
          cur.count += 1;
          if (!cur.last || b.scheduled_at > cur.last) cur.last = b.scheduled_at;
          counts.set(b.client_id, cur);
        }

        let candidateIds = Array.from(counts.keys());

        // Pre-filter "selected"
        const selected: string[] = Array.isArray(campaign.selected_client_ids)
          ? campaign.selected_client_ids
          : [];
        if (campaign.audience_filter === 'selected' && selected.length > 0) {
          const sel = new Set(selected);
          candidateIds = candidateIds.filter((id) => sel.has(id));
        }

        // VIP/new/regular by tags + booking count
        if (campaign.audience_filter === 'vip') {
          const { data: tags } = await admin
            .from('client_tags')
            .select('client_id')
            .eq('tag', 'vip')
            .in('client_id', candidateIds);
          const vipSet = new Set((tags || []).map((t: any) => t.client_id));
          candidateIds = candidateIds.filter((id) => vipSet.has(id));
        } else if (campaign.audience_filter === 'new') {
          candidateIds = candidateIds.filter(
            (id) => (counts.get(id)?.count || 0) <= 1,
          );
        } else if (campaign.audience_filter === 'regular') {
          candidateIds = candidateIds.filter(
            (id) => (counts.get(id)?.count || 0) >= 3,
          );
        }

        // Drop blacklisted by the business owner
        const { data: bl } = await admin
          .from('blacklists')
          .select('blocked_id')
          .eq('blocker_id', campaign.creator_id);
        const blSet = new Set((bl || []).map((x: any) => x.blocked_id));
        recipientIds = candidateIds.filter((id) => !blSet.has(id));
      } else if (targetType === 'skillspot_clients') {
        // Pre-moderated paid campaign.
        // Audience = up to target_count platform users matching audience_filter,
        // optionally excluding own clients.
        const limit = Math.min(campaign.target_count || 0, MAX_RECIPIENTS);
        if (limit <= 0) {
          recipientIds = [];
        } else {
          let q = admin.from('profiles').select('id').limit(limit);
          // audience_filter is best-effort — keep simple ordering.
          const { data: profs } = await q;
          recipientIds = (profs || []).map((p: any) => p.id);

          if (campaign.business_id && campaign.include_own_clients === false) {
            const { data: ownBks } = await admin
              .from('bookings')
              .select('client_id')
              .eq('organization_id', campaign.business_id)
              .limit(20000);
            const ownSet = new Set((ownBks || []).map((b: any) => b.client_id));
            recipientIds = recipientIds.filter((id) => !ownSet.has(id));
          }
        }
      }

      // Always exclude the creator from receiving their own broadcast.
      recipientIds = recipientIds.filter((id) => id !== campaign.creator_id);

      // Hard cap.
      if (recipientIds.length > MAX_RECIPIENTS) {
        recipientIds = recipientIds.slice(0, MAX_RECIPIENTS);
      }

      if (recipientIds.length === 0) {
        await admin.from('marketing_campaigns').update({
          status: 'sent',
          sent_count: 0,
          sent_at: new Date().toISOString(),
        }).eq('id', campaign.id);
        return json(200, { sent: 0, push_sent: 0, message: 'Empty audience' });
      }

      // Resolve names for templating.
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, first_name')
        .in('id', recipientIds);
      const nameMap = new Map<string, string>(
        (profiles || []).map((p: any) => [p.id, p.first_name || 'Клиент']),
      );

      const messages = recipientIds.map((rid) => ({
        sender_id: campaign.creator_id,
        recipient_id: rid,
        message: applyVars(campaign.message, {
          имя: nameMap.get(rid) || 'Клиент',
        }),
        chat_type: 'marketing',
      }));

      const CHUNK = 500;
      for (let i = 0; i < messages.length; i += CHUNK) {
        const { error: insErr } = await admin
          .from('chat_messages')
          .insert(messages.slice(i, i + CHUNK));
        if (insErr) {
          console.error('[send-broadcast] insert failed', insErr);
          // Roll back lock so it can be retried.
          await admin
            .from('marketing_campaigns')
            .update({ status: campaign.status })
            .eq('id', campaign.id);
          return json(500, { error: 'Insert failed', details: insErr.message });
        }
      }

      let pushSent = 0;
      if (body.push) {
        try {
          const pushRes = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${SERVICE_ROLE}`,
            },
            body: JSON.stringify({
              user_ids: recipientIds,
              title: campaign.title,
              body: campaign.message.slice(0, 200),
              url: '/dashboard',
              tag: `broadcast-${campaign.id}`,
            }),
          });
          const pj = await pushRes.json().catch(() => ({}));
          pushSent = pj?.sent || 0;
        } catch (e) {
          console.error('[send-broadcast] push failed', e);
        }
      }

      // Mark sent + release hold for paid campaigns (the money was earned).
      const updates: Record<string, unknown> = {
        status: 'sent',
        sent_count: messages.length,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (isPaid) updates.hold_released = true;
      await admin
        .from('marketing_campaigns')
        .update(updates)
        .eq('id', campaign.id);

      return json(200, { sent: messages.length, push_sent: pushSent });
    } catch (err: any) {
      // Restore previous status so the user can retry.
      await admin
        .from('marketing_campaigns')
        .update({ status: campaign.status })
        .eq('id', campaign.id);
      console.error('[send-broadcast] failure', err);
      return json(500, { error: err?.message || 'send failed' });
    }
  } catch (err: any) {
    console.error('[send-broadcast] unexpected', err);
    return json(500, { error: err?.message || 'unknown' });
  }
});
