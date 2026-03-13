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
    const TERMINAL_KEY = Deno.env.get('TINKOFF_TERMINAL_KEY');
    const TERMINAL_PASSWORD = Deno.env.get('TINKOFF_PASSWORD');
    if (!TERMINAL_KEY || !TERMINAL_PASSWORD) {
      throw new Error('Tinkoff credentials not configured');
    }

    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader || '' } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    const { booking_id } = await req.json();
    if (!booking_id) throw new Error('booking_id is required');

    const { data: booking, error: bErr } = await supabase
      .from('bookings')
      .select('*, services(name, price)')
      .eq('id', booking_id)
      .eq('client_id', user.id)
      .single();

    if (bErr || !booking) throw new Error('Booking not found or access denied');
    if (booking.is_paid) throw new Error('Booking is already paid');

    const amount = Math.round((booking.services?.price || 0) * 100);
    if (amount <= 0) throw new Error('Invalid amount');

    const orderId = `booking_${booking_id}_${Date.now()}`;

    const params: Record<string, string> = {
      TerminalKey: TERMINAL_KEY,
      Amount: String(amount),
      OrderId: orderId,
      Description: `Оплата услуги: ${booking.services?.name || 'Услуга'}`,
    };

    const tokenParams = { ...params, Password: TERMINAL_PASSWORD };
    const sortedKeys = Object.keys(tokenParams).sort();
    const tokenString = sortedKeys.map(k => tokenParams[k]).join('');
    const encoder = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', encoder.encode(tokenString));
    const token = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');

    const tinkoffPayload = {
      ...params,
      Token: token,
    };

    const tinkoffRes = await fetch('https://securepay.tinkoff.ru/v2/Init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tinkoffPayload),
    });

    const tinkoffData = await tinkoffRes.json();

    if (!tinkoffData.Success) {
      throw new Error(`Tinkoff error: ${tinkoffData.Message || tinkoffData.Details || 'Unknown'}`);
    }

    await supabase
      .from('bookings')
      .update({ payment_id: tinkoffData.PaymentId })
      .eq('id', booking_id);

    return new Response(JSON.stringify({
      success: true,
      payment_url: tinkoffData.PaymentURL,
      payment_id: tinkoffData.PaymentId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
