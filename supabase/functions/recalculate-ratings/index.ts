import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
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

    // Get all users who have at least 1 booking or 30+ days on platform
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, created_at')
      .limit(1000)

    if (error) throw error

    let processed = 0
    let errors = 0
    const batchSize = 50
    const userList = users || []

    // Process in batches to avoid timeout
    for (let i = 0; i < userList.length; i += batchSize) {
      const batch = userList.slice(i, i + batchSize)
      
      await Promise.all(
        batch.map(async (user) => {
          const { error: calcError } = await supabase.rpc('calculate_user_score', {
            _user_id: user.id,
          })
          if (calcError) {
            errors++
            console.error(`Error calculating score for ${user.id}:`, calcError.message)
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
        total: userList.length,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Recalculate ratings error:', err)
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})