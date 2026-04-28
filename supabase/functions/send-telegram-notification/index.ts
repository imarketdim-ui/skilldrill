import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramBody {
  user_ids: string[];
  text: string;
  source?: string;
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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');

    if (!TELEGRAM_BOT_TOKEN) return json(500, { error: 'Telegram bot token not configured' });

    const authHeader = req.headers.get('Authorization') || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (bearer !== SERVICE_ROLE) return json(403, { error: 'Forbidden' });

    let body: TelegramBody;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: 'Invalid JSON' });
    }

    if (!Array.isArray(body.user_ids) || body.user_ids.length === 0 || !body.text?.trim()) {
      return json(400, { error: 'user_ids[] and text are required' });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const targetIds = Array.from(new Set(body.user_ids.filter(Boolean)));
    const { data: profiles, error } = await admin
      .from('profiles')
      .select('id, telegram_chat_id')
      .in('id', targetIds)
      .not('telegram_chat_id', 'is', null);

    if (error) return json(500, { error: error.message });
    if (!profiles?.length) return json(200, { sent: 0, total: 0, message: 'No linked telegram chats' });

    let sent = 0;
    let failed = 0;

    await Promise.all(
      profiles.map(async (profile: any) => {
        try {
          const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: profile.telegram_chat_id,
              text: body.text.slice(0, 4096),
              disable_web_page_preview: true,
            }),
          });

          if (!res.ok) {
            failed++;
            const payload = await res.text();
            console.error('[send-telegram-notification] telegram send failed', payload);
            return;
          }

          sent++;
        } catch (err) {
          failed++;
          console.error('[send-telegram-notification] unexpected', err);
        }
      }),
    );

    return json(200, { sent, failed, total: profiles.length });
  } catch (err: any) {
    console.error('[send-telegram-notification] fatal', err);
    return json(500, { error: err?.message || 'unknown' });
  }
});
