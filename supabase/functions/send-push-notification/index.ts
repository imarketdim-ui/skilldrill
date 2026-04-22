import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  user_ids: string[];
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY');
    const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY');
    const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:noreply@skillspot.app';

    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

    const body: PushPayload = await req.json();
    if (!body.user_ids?.length || !body.title || !body.body) {
      return new Response(JSON.stringify({ error: 'user_ids, title, body required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('user_id, endpoint, keys')
      .in('user_id', body.user_ids)
      .eq('is_active', true);

    if (!subs?.length) {
      return new Response(JSON.stringify({ sent: 0, message: 'No active subscriptions' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.stringify({
      title: body.title,
      body: body.body,
      url: body.url || '/',
      tag: body.tag || 'skillspot',
    });

    let sent = 0; let failed = 0;
    await Promise.all(subs.map(async (s: any) => {
      try {
        const keys = typeof s.keys === 'string' ? JSON.parse(s.keys) : s.keys;
        await webpush.sendNotification({ endpoint: s.endpoint, keys }, payload);
        sent++;
      } catch (e: any) {
        failed++;
        if (e?.statusCode === 410 || e?.statusCode === 404) {
          await supabase.from('push_subscriptions').update({ is_active: false }).eq('endpoint', s.endpoint);
        }
      }
    }));

    return new Response(JSON.stringify({ sent, failed, total: subs.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
