import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = "https://skilldrill.lovable.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LIMITS: Record<string, { max: number; window_seconds: number }> = {
  create_booking: { max: 10, window_seconds: 3600 },
  create_dispute: { max: 3, window_seconds: 3600 },
  send_message: { max: 60, window_seconds: 60 },
  create_review: { max: 10, window_seconds: 3600 },
  default: { max: 30, window_seconds: 60 },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action } = await req.json();
    const config = LIMITS[action] || LIMITS.default;
    const windowStart = new Date(
      Date.now() - config.window_seconds * 1000
    ).toISOString();
    const resetAt = new Date(
      Date.now() + config.window_seconds * 1000
    ).toISOString();

    const { count } = await supabase
      .from("rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("action", action)
      .gte("created_at", windowStart);

    const currentCount = count || 0;
    const allowed = currentCount < config.max;

    if (allowed) {
      await supabase
        .from("rate_limits")
        .insert({ user_id: user.id, action });
    }

    return new Response(
      JSON.stringify({
        allowed,
        remaining: Math.max(0, config.max - currentCount - (allowed ? 1 : 0)),
        reset_at: resetAt,
      }),
      {
        status: allowed ? 200 : 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
