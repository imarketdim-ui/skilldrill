import { supabase } from '@/integrations/supabase/client';

export async function checkRateLimit(action: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('rate-limiter', {
      body: { action },
    });
    if (error || !data?.allowed) return false;
    return true;
  } catch {
    // If rate-limiter is unavailable, allow the action but log
    console.warn('Rate limiter unavailable, allowing action');
    return true;
  }
}
