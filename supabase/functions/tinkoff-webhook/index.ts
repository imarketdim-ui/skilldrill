// Tinkoff payment webhook.
//
// CONTRACT
// --------
// - Signature/token MUST be valid; otherwise we return 401 so Tinkoff retries
//   eventually (and so we never silently drop a bad signature).
// - DB lookups + mutations MUST surface errors as 5xx for retry.
// - Side effects (status update, notifications) MUST be idempotent: a
//   second CONFIRMED webhook for the same payment_id does NOT mutate state
//   nor create duplicate notifications.
// - We acknowledge with 200 OK ONLY when state is fully reconciled
//   (or was already reconciled).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = "*"; // Tinkoff origins vary; webhook does not need CORS for browsers.

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    console.error('[tinkoff-webhook] invalid JSON', e);
    return json(400, { error: 'Invalid JSON' });
  }

  try {
    const TERMINAL_PASSWORD = Deno.env.get('TINKOFF_PASSWORD');
    if (!TERMINAL_PASSWORD) {
      console.error('[tinkoff-webhook] TINKOFF_PASSWORD missing');
      return json(500, { error: 'Server misconfigured' });
    }

    // ---- Verify token ----
    const receivedToken = body.Token;
    if (!receivedToken || typeof receivedToken !== 'string') {
      console.warn('[tinkoff-webhook] missing token');
      return json(401, { error: 'Missing token' });
    }

    const paramsForToken: Record<string, string> = {};
    for (const [key, value] of Object.entries(body)) {
      if (key === 'Token' || typeof value === 'object') continue;
      paramsForToken[key] = String(value);
    }
    paramsForToken['Password'] = TERMINAL_PASSWORD;

    const sortedKeys = Object.keys(paramsForToken).sort();
    const tokenString = sortedKeys.map((k) => paramsForToken[k]).join('');
    const encoder = new TextEncoder();
    const hash = await crypto.subtle.digest(
      'SHA-256',
      encoder.encode(tokenString),
    );
    const expectedToken = Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (receivedToken !== expectedToken) {
      console.warn('[tinkoff-webhook] invalid token for', body.PaymentId);
      return json(401, { error: 'Invalid token' });
    }

    // ---- Resolve booking ----
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const paymentId = body.PaymentId != null ? String(body.PaymentId) : '';
    const status = String(body.Status || '');
    if (!paymentId) return json(400, { error: 'PaymentId required' });

    const { data: booking, error: findErr } = await supabase
      .from('bookings')
      .select('id, client_id, executor_id, status, payment_status, is_paid')
      .eq('payment_id', paymentId)
      .maybeSingle();

    if (findErr) {
      console.error('[tinkoff-webhook] booking lookup failed', findErr);
      return json(500, { error: 'Lookup failed' });
    }
    if (!booking) {
      // Unknown payment id — acknowledge so Tinkoff stops retrying, but log.
      console.warn('[tinkoff-webhook] no booking for payment', paymentId);
      return json(200, { ok: true, ignored: true });
    }

    // ---- Idempotency: skip if already in target state ----
    if (status === 'CONFIRMED') {
      if (booking.payment_status === 'confirmed' || booking.is_paid === true) {
        return json(200, { ok: true, idempotent: true });
      }

      const { error: upErr } = await supabase
        .from('bookings')
        .update({
          is_paid: true,
          status: 'confirmed',
          payment_status: 'confirmed',
        })
        .eq('id', booking.id)
        .neq('payment_status', 'confirmed'); // race-safe

      if (upErr) {
        console.error('[tinkoff-webhook] booking update failed', upErr);
        return json(500, { error: 'Update failed' });
      }

      // Notifications use stable related_id = booking.id, so we de-dupe
      // explicitly: insert only if not already present.
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('related_id', booking.id)
        .in('type', ['payment_success', 'payment_received'])
        .limit(1);

      if (!existing?.length) {
        const { error: nErr } = await supabase.from('notifications').insert([
          {
            user_id: booking.client_id,
            type: 'payment_success',
            title: 'Оплата прошла успешно',
            message: 'Ваша запись оплачена и подтверждена.',
            related_id: booking.id,
          },
          {
            user_id: booking.executor_id,
            type: 'payment_received',
            title: 'Получена оплата',
            message: 'Клиент оплатил запись.',
            related_id: booking.id,
          },
        ]);
        if (nErr) {
          console.error('[tinkoff-webhook] notif insert failed', nErr);
          // The booking update already committed; we still ack so we don't
          // re-confirm bookings on retry. Notifications can be backfilled.
        }
      }

      return json(200, { ok: true });
    }

    if (status === 'REJECTED' || status === 'CANCELED') {
      const targetStatus = status === 'REJECTED' ? 'rejected' : 'canceled';
      if (booking.payment_status === targetStatus) {
        return json(200, { ok: true, idempotent: true });
      }

      const { error: upErr } = await supabase
        .from('bookings')
        .update({ payment_status: targetStatus })
        .eq('id', booking.id)
        .neq('payment_status', targetStatus);

      if (upErr) {
        console.error('[tinkoff-webhook] booking reject update failed', upErr);
        return json(500, { error: 'Update failed' });
      }

      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('related_id', booking.id)
        .eq('type', 'payment_failed')
        .limit(1);

      if (!existing?.length) {
        await supabase.from('notifications').insert({
          user_id: booking.client_id,
          type: 'payment_failed',
          title: 'Оплата не прошла',
          message: 'Попробуйте оплатить снова из Личного кабинета.',
          related_id: booking.id,
        });
      }

      return json(200, { ok: true });
    }

    // Other statuses (NEW, AUTHORIZED, etc.) — just acknowledge.
    return json(200, { ok: true, status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[tinkoff-webhook] unhandled', message);
    return json(500, { error: 'Internal error' });
  }
});
