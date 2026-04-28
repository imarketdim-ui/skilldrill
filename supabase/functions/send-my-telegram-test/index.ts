import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');

    if (!TELEGRAM_BOT_TOKEN) {
      return json(500, { error: 'Telegram bot token not configured' });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json(401, { error: 'Unauthorized' });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (userErr || !user) return json(401, { error: 'Unauthorized' });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('first_name, telegram_chat_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileErr) {
      console.error('[send-my-telegram-test] profile lookup failed', profileErr);
      return json(500, { error: profileErr.message });
    }

    if (!profile?.telegram_chat_id) {
      return json(409, { error: 'Telegram is not linked for this user' });
    }

    const message = [
      'SkillSpot test message',
      '',
      `Привет${profile.first_name ? `, ${profile.first_name}` : ''}!`,
      'Telegram-уведомления подключены и работают корректно.',
      `Проверка: ${new Date().toISOString()}`,
    ].join('\n');

    const telegramRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: profile.telegram_chat_id,
        text: message,
        disable_web_page_preview: true,
      }),
    });

    if (!telegramRes.ok) {
      const payload = await telegramRes.text();
      console.error('[send-my-telegram-test] telegram send failed', payload);
      return json(502, { error: 'Telegram API request failed', details: payload });
    }

    return json(200, { ok: true, message: 'Test telegram notification sent' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown';
    console.error('[send-my-telegram-test] fatal', err);
    return json(500, { error: message });
  }
});
