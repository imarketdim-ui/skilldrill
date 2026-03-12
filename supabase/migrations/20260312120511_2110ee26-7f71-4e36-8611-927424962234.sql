
-- Fix overly permissive rate_limits policy - restrict to service role only
DROP POLICY IF EXISTS "Service role full access to rate_limits" ON public.rate_limits;

-- rate_limits is only used by edge functions via service role key
-- No authenticated user should access it directly
-- Disabling RLS since only service role accesses this table
ALTER TABLE public.rate_limits DISABLE ROW LEVEL SECURITY;
