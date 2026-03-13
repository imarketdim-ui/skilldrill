import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = "https://skilldrill.lovable.app";

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TERMINAL_PASSWORD = Deno.env.get('TINKOFF_PASSWORD');
    if (!TERMINAL_PASSWORD) {
      throw new Error('TINKOFF_PASSWORD not configured');
    }

    const body = await req.json();

    // Verify token
    const receivedToken = body.Token;
    const paramsForToken: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(body)) {
      if (key === 'Token' || typeof value === 'object') continue;
      paramsForToken[key] = String(value);
    }
    paramsForToken['Password'] = TERMINAL_PASSWORD;

    const sortedKeys = Object.keys(paramsForToken).sort();
    const tokenString = sortedKeys.map(k => paramsForToken[k]).join('');
    const encoder = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', encoder.encode(tokenString));
    const expectedToken = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (receivedToken !== expectedToken) {
      throw new Error('Invalid token');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const paymentId = String(body.PaymentId);
    const status = body.Status;

    const { data: booking, error: findErr } = await supabase
      .from('bookings')
      .select('id, client_id, executor_id, service_id')
      .eq('payment_id', paymentId)
      .maybeSingle();

    if (findErr || !booking) {
      return new Response('OK', { headers: corsHeaders });
    }

    if (status === 'CONFIRMED') {
      await supabase
        .from('bookings')
        .update({ is_paid: true, status: 'confirmed' })
        .eq('id', booking.id);

      await supabase.from('notifications').insert({
        user_id: booking.client_id,
        type: 'payment_success',
        title: 'Оплата прошла успешно',
        message: 'Ваша запись оплачена и подтверждена.',
        related_id: booking.id,
      });

      await supabase.from('notifications').insert({
        user_id: booking.executor_id,
        type: 'payment_received',
        title: 'Получена оплата',
        message: 'Клиент оплатил запись.',
        related_id: booking.id,
      });
    } else if (status === 'REJECTED' || status === 'CANCELED') {
      await supabase.from('notifications').insert({
        user_id: booking.client_id,
        type: 'payment_failed',
        title: 'Оплата не прошла',
        message: 'Попробуйте оплатить снова из Личного кабинета.',
        related_id: booking.id,
      });
    }

    return new Response('OK', { headers: corsHeaders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response('OK', { headers: corsHeaders });
  }
});
