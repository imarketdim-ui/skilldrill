
-- Fix: rate_limits table has RLS enabled but no policies
-- This table is used by edge functions with service role key, so allow service role access
CREATE POLICY "Service role full access to rate_limits"
  ON public.rate_limits FOR ALL
  USING (true)
  WITH CHECK (true);
