
-- Bonus programs table
CREATE TABLE public.bonus_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.business_locations(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  description text,
  conditions text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.bonus_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners manage bonus_programs"
  ON public.bonus_programs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM business_locations WHERE id = business_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM business_managers WHERE business_id = bonus_programs.business_id AND user_id = auth.uid() AND is_active = true)
  );

-- Gift certificates table
CREATE TABLE public.gift_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.business_locations(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  amount numeric NOT NULL,
  recipient_name text,
  validity_days integer DEFAULT 365,
  status text DEFAULT 'issued',
  created_at timestamptz DEFAULT now(),
  redeemed_at timestamptz
);

-- Validation trigger instead of CHECK for status
CREATE OR REPLACE FUNCTION public.validate_gift_certificate_status()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('issued', 'redeemed', 'expired') THEN
    RAISE EXCEPTION 'Invalid certificate status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_gift_certificate_status_trigger
  BEFORE INSERT OR UPDATE ON public.gift_certificates
  FOR EACH ROW EXECUTE FUNCTION public.validate_gift_certificate_status();

ALTER TABLE public.gift_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business manages certificates"
  ON public.gift_certificates FOR ALL
  USING (
    EXISTS (SELECT 1 FROM business_locations WHERE id = business_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM business_managers WHERE business_id = gift_certificates.business_id AND user_id = auth.uid() AND is_active = true)
  );

-- Business settings table (booking + notification config)
CREATE TABLE public.business_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid UNIQUE NOT NULL REFERENCES public.business_locations(id) ON DELETE CASCADE,
  booking jsonb DEFAULT '{}'::jsonb,
  notifications jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners manage settings"
  ON public.business_settings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM business_locations WHERE id = business_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM business_managers WHERE business_id = business_settings.business_id AND user_id = auth.uid() AND is_active = true)
  );

-- Add unique constraint on client_tags for upsert support
CREATE UNIQUE INDEX IF NOT EXISTS client_tags_unique_per_tag
  ON public.client_tags (client_id, tagger_id, tag)
  WHERE tag IN ('vip', 'blacklist', 'manual_client');
