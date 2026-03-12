
-- Re-enable RLS on rate_limits with proper policy for service role
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow inserts/updates/selects for authenticated users (edge functions authenticate)
CREATE POLICY "Rate limits managed by system"
  ON public.rate_limits FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
