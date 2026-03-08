-- Fix: Allow anonymous (public) access to active services in catalog
DROP POLICY IF EXISTS "Active services are viewable by everyone" ON public.services;

CREATE POLICY "Active services are viewable by everyone"
ON public.services FOR SELECT
TO anon, authenticated
USING (is_active = true OR master_id = auth.uid());