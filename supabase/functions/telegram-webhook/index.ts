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

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const TELEGRAM_WEBHOOK_SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET');
    if (!TELEGRAM_BOT_TOKEN) return json(500, { error: 'Telegram bot token not configured' });
    if (!TELEGRAM_WEBHOOK_SECRET) return json(500, { error: 'Telegram webhook secret not configured' });

    const requestSecret = req.headers.get('x-telegram-bot-api-secret-token');
    if (requestSecret !== TELEGRAM_WEBHOOK_SECRET) {
      return json(403, { error: 'Forbidden' });
    }

    const update = await req.json().catch(() => null);
    const message = update?.message;
    const chatId = message?.chat?.id ? String(message.chat.id) : null;
    const text = String(message?.text || '').trim();

    if (!chatId || !text) return json(200, { ok: true, ignored: true });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const startMatch = text.match(/^\/start(?:\s+(.+))?$/i);

    if (!startMatch?.[1]) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: 'Чтобы привязать Telegram к SkillSpot, откройте бот из личного кабинета и используйте персональную ссылку.',
        }),
      });
      return json(200, { ok: true });
    }

    const token = startMatch[1].trim();
    const tokenHash = await sha256Hex(token);
    const nowIso = new Date().toISOString();

    const { data: linkToken, error } = await admin
      .from('telegram_link_tokens')
      .select('id, user_id, expires_at, used_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (
      error ||
      !linkToken ||
      linkToken.used_at ||
      linkToken.expires_at <= nowIso
    ) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: 'Ссылка привязки недействительна или устарела. Откройте привязку Telegram заново в личном кабинете SkillSpot.',
        }),
      });
      return json(200, { ok: true, linked: false });
    }

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, first_name')
      .eq('id', linkToken.user_id)
      .maybeSingle();

    if (profileError || !profile) {
      console.error('[telegram-webhook] profile lookup failed', profileError);
      return json(500, { error: 'Profile lookup failed' });
    }

    const { data: claimedToken, error: tokenUpdateError } = await admin
      .from('telegram_link_tokens')
      .update({ used_at: nowIso })
      .eq('id', linkToken.id)
      .is('used_at', null)
      .select('id')
      .maybeSingle();

    if (tokenUpdateError || !claimedToken) {
      console.error('[telegram-webhook] token update failed', tokenUpdateError);
      return json(409, { error: 'Token already used' });
    }

    const { error: updateError } = await admin
      .from('profiles')
      .update({ telegram_chat_id: chatId })
      .eq('id', profile.id);

    if (updateError) {
      console.error('[telegram-webhook] profile update failed', updateError);
      return json(500, { error: updateError.message });
    }

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `Готово! Telegram привязан к профилю ${profile.first_name || 'SkillSpot'}. Теперь вы будете получать уведомления здесь.`,
      }),
    });

    return json(200, { ok: true, linked: true, profile_id: profile.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown';
    console.error('[telegram-webhook] fatal', err);
    return json(500, { error: message });
  }
});
