import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGIN = "https://skilldrill.lovable.app";

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const cronSecret = Deno.env.get('CRON_SECRET')
  const callerSecret = req.headers.get('x-cron-secret')
  if (!cronSecret || callerSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    
    const { data: activeUserIds } = await supabase
      .from('bookings')
      .select('client_id')
      .gte('updated_at', thirtyDaysAgo)
      .limit(1000)

    const uniqueIds = [...new Set((activeUserIds || []).map((r: any) => r.client_id))]

    let processed = 0
    let errors = 0
    const batchSize = 50

    for (let i = 0; i < uniqueIds.length; i += batchSize) {
      const batch = uniqueIds.slice(i, i + batchSize)
      
      await Promise.all(
        batch.map(async (userId) => {
          const { error: calcError } = await supabase.rpc('calculate_user_score', {
            _user_id: userId,
          })
          if (calcError) {
            errors++
          } else {
            processed++
          }
        })
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        errors,
        total: uniqueIds.length,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
