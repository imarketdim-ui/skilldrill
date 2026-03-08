import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get all users who have bookings (active users)
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(500)

    if (error) throw error

    let processed = 0
    let errors = 0

    for (const user of users || []) {
      const { error: calcError } = await supabase.rpc('calculate_user_score', {
        _user_id: user.id,
      })
      if (calcError) {
        errors++
      } else {
        processed++
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        errors,
        timestamp: new Date().toISOString(),
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
