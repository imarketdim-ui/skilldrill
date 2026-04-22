import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BroadcastBody {
  campaign_id: string;
  recipient_ids: string[]; // pre-resolved audience
  push?: boolean;
}

function applyVars(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: BroadcastBody = await req.json();
    if (!body.campaign_id || !body.recipient_ids?.length) {
      return new Response(JSON.stringify({ error: 'campaign_id and recipient_ids required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: campaign, error: cErr } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('id', body.campaign_id)
      .single();
    if (cErr || !campaign) {
      return new Response(JSON.stringify({ error: 'Campaign not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (campaign.creator_id !== user.id) {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['platform_admin', 'super_admin', 'moderator'])
        .eq('is_active', true);
      if (!roles?.length) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', body.recipient_ids);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    const messages = body.recipient_ids.map((rid) => {
      const p: any = profileMap.get(rid);
      const text = applyVars(campaign.message, {
        имя: p?.first_name || 'Клиент',
        мастер: '',
        дата: '',
        услуга: '',
      });
      return {
        sender_id: campaign.creator_id,
        recipient_id: rid,
        message: text,
        chat_type: 'marketing',
      };
    });

    const CHUNK = 500;
    for (let i = 0; i < messages.length; i += CHUNK) {
      await supabase.from('chat_messages').insert(messages.slice(i, i + CHUNK));
    }

    let pushSent = 0;
    if (body.push) {
      try {
        const pushRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            user_ids: body.recipient_ids,
            title: campaign.title,
            body: campaign.message.slice(0, 200),
            url: '/dashboard',
            tag: `broadcast-${campaign.id}`,
          }),
        });
        const pj = await pushRes.json();
        pushSent = pj?.sent || 0;
      } catch (_) { /* ignore push errors */ }
    }

    await supabase.from('marketing_campaigns')
      .update({ status: 'sent', sent_count: messages.length, sent_at: new Date().toISOString() })
      .eq('id', campaign.id);

    return new Response(JSON.stringify({ sent: messages.length, push_sent: pushSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
