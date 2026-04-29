-- Apply pending migrations from repo: business_settings sections + profile priority preferences
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS crm jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS erp jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS priority_business_id uuid REFERENCES public.business_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority_master_profile_id uuid REFERENCES public.master_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_priority_business_id
  ON public.profiles(priority_business_id);

CREATE INDEX IF NOT EXISTS idx_profiles_priority_master_profile_id
  ON public.profiles(priority_master_profile_id);

UPDATE public.profiles p
SET priority_business_id = fallback.business_id
FROM (
  SELECT DISTINCT ON (bl.owner_id)
    bl.owner_id,
    bl.id AS business_id
  FROM public.business_locations bl
  ORDER BY bl.owner_id, bl.created_at
) AS fallback
WHERE p.id = fallback.owner_id
  AND p.priority_business_id IS NULL;

UPDATE public.profiles p
SET priority_master_profile_id = mp.id
FROM public.master_profiles mp
WHERE p.id = mp.user_id
  AND p.priority_master_profile_id IS NULL;