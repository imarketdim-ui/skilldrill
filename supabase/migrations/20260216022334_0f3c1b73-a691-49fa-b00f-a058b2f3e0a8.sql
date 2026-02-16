
-- Fix referral_codes RLS: replace ALL policy with explicit policies
DROP POLICY IF EXISTS "Users manage own referral codes" ON public.referral_codes;
DROP POLICY IF EXISTS "Active referral codes viewable" ON public.referral_codes;

CREATE POLICY "Users can view active referral codes"
ON public.referral_codes FOR SELECT
USING (is_active = true OR user_id = auth.uid());

CREATE POLICY "Users can insert own referral codes"
ON public.referral_codes FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own referral codes"
ON public.referral_codes FOR UPDATE
USING (user_id = auth.uid());
