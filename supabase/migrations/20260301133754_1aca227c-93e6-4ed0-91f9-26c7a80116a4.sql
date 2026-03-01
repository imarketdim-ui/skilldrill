
-- Platform settings table for centralized pricing
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform settings readable by everyone"
  ON public.platform_settings FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify platform settings"
  ON public.platform_settings FOR ALL
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

INSERT INTO public.platform_settings (key, value) VALUES
  ('pricing', '{"master": 690, "business": 2490, "network": 6490}'::jsonb),
  ('trial_days', '{"master": 14, "business": 14, "network": 14}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Add city column to master_profiles
ALTER TABLE public.master_profiles ADD COLUMN IF NOT EXISTS city TEXT;

-- Add city and category_id columns to business_locations
ALTER TABLE public.business_locations ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.business_locations ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.service_categories(id);

-- Add referred_by to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by TEXT;

-- Populate city from existing addresses (extract city = typically second-to-last comma-separated part that looks like a city name)
UPDATE public.master_profiles
SET city = 'Абакан'
WHERE address IS NOT NULL AND address ILIKE '%Абакан%' AND city IS NULL;

UPDATE public.business_locations
SET city = 'Абакан'
WHERE address IS NOT NULL AND address ILIKE '%Абакан%' AND city IS NULL;

-- Populate category_id for business_locations from their linked masters
UPDATE public.business_locations bl
SET category_id = sub.category_id
FROM (
  SELECT bm.business_id, mp.category_id
  FROM public.business_masters bm
  JOIN public.master_profiles mp ON mp.user_id = bm.master_id
  WHERE mp.category_id IS NOT NULL AND bm.status = 'accepted'
  LIMIT 1
) sub
WHERE bl.id = sub.business_id AND bl.category_id IS NULL;

-- Update handle_new_user to save referred_by
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_count INTEGER;
BEGIN
  INSERT INTO public.profiles (id, email, skillspot_id, first_name, last_name, referred_by)
  VALUES (
    NEW.id,
    NEW.email,
    public.generate_skillspot_id(),
    COALESCE(NEW.raw_user_meta_data->>'first_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'last_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'referred_by', NULL)
  )
  ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client')
  ON CONFLICT DO NOTHING;
  
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin')
    ON CONFLICT DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'platform_admin')
    ON CONFLICT DO NOTHING;
    UPDATE public.profiles SET platform_role = 'platform_admin' WHERE id = NEW.id;
  END IF;
  
  INSERT INTO public.user_balances (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$;
