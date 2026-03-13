import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = "https://skilldrill.lovable.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  const callerSecret = req.headers.get("x-cron-secret");
  if (!cronSecret || callerSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: bookings, error: fetchError } = await supabase
      .from("bookings")
      .select("id, client_id, executor_id, scheduled_at, duration_minutes, service_id")
      .in("status", ["confirmed", "in_progress"])
      .lt("scheduled_at", cutoff)
      .limit(500);

    if (fetchError) throw fetchError;

    let completed = 0;
    let errors = 0;

    for (const booking of bookings || []) {
      const endTime = new Date(
        new Date(booking.scheduled_at).getTime() +
          (booking.duration_minutes || 60) * 60000
      );
      if (endTime.getTime() < Date.now() - 24 * 60 * 60 * 1000) {
        const { error } = await supabase
          .from("bookings")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("id", booking.id);

        if (error) {
          errors++;
        } else {
          completed++;
          await supabase.from("notifications").insert({
            user_id: booking.client_id,
            type: "booking_completed",
            title: "Запись завершена",
            message: "Ваша запись была автоматически завершена. Если возникли проблемы, вы можете открыть спор.",
            related_id: booking.id,
          });
          await supabase.from("notifications").insert({
            user_id: booking.executor_id,
            type: "booking_completed",
            title: "Запись завершена",
            message: "Запись клиента была автоматически завершена.",
            related_id: booking.id,
          });
        }
      }
    }

    // Reminders for upcoming bookings
    const reminderWindows = [15, 30, 60, 180, 1440];
    let reminders = 0;

    for (const mins of reminderWindows) {
      const windowStart = new Date(Date.now() + (mins - 1) * 60000);
      const windowEnd = new Date(Date.now() + (mins + 1) * 60000);

      const { data: upcoming } = await supabase
        .from("bookings")
        .select("id, client_id, scheduled_at, services!bookings_service_id_fkey(name)")
        .in("status", ["confirmed"])
        .gte("scheduled_at", windowStart.toISOString())
        .lt("scheduled_at", windowEnd.toISOString())
        .limit(200);

      for (const b of upcoming || []) {
        const serviceName = (b as any).services?.name || "Услуга";
        const timeLabel = mins >= 60 ? `${Math.floor(mins / 60)} ч` : `${mins} мин`;

        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", b.client_id)
          .eq("related_id", b.id)
          .eq("type", "booking_reminder")
          .limit(1);

        if (!existing || existing.length === 0) {
          await supabase.from("notifications").insert({
            user_id: b.client_id,
            type: "booking_reminder",
            title: `Напоминание: ${serviceName}`,
            message: `До вашей записи осталось ${timeLabel}`,
            related_id: b.id,
          });
          reminders++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        completed,
        errors,
        reminders,
        checked: bookings?.length || 0,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
