
-- Storage buckets for media
INSERT INTO storage.buckets (id, name, public) VALUES ('portfolio', 'portfolio', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('interiors', 'interiors', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('certificates', 'certificates', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload portfolio" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('portfolio', 'interiors', 'certificates') AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Anyone can view public media" ON storage.objects FOR SELECT USING (bucket_id IN ('portfolio', 'interiors', 'certificates'));
CREATE POLICY "Users can update own media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id IN ('portfolio', 'interiors', 'certificates') AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id IN ('portfolio', 'interiors', 'certificates') AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add moderation and profile fields to master_profiles
ALTER TABLE public.master_profiles
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS hashtags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS work_photos jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS certificate_photos jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS interior_photos jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS moderation_comment text;

-- Add moderation to business_locations
ALTER TABLE public.business_locations
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS moderation_comment text,
  ADD COLUMN IF NOT EXISTS hashtags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS director_name text,
  ADD COLUMN IF NOT EXISTS work_photos jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS certificate_photos jsonb DEFAULT '[]'::jsonb;

-- Add moderation to networks
ALTER TABLE public.networks
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS moderation_comment text,
  ADD COLUMN IF NOT EXISTS hashtags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS inn text,
  ADD COLUMN IF NOT EXISTS legal_form text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS director_name text;

-- Add master_id to services so individual masters can have services
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS master_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS hashtags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.service_categories(id);

-- Make organization_id nullable (masters don't have org)
ALTER TABLE public.services ALTER COLUMN organization_id DROP NOT NULL;

-- RLS policy for masters to manage their services
CREATE POLICY "Masters manage own services" ON public.services FOR ALL TO authenticated
  USING (master_id = auth.uid() OR is_platform_admin(auth.uid()))
  WITH CHECK (master_id = auth.uid() OR is_platform_admin(auth.uid()));

-- Service templates for catalog
CREATE TABLE IF NOT EXISTS public.service_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.service_categories(id) NOT NULL,
  name text NOT NULL,
  description text,
  default_duration_minutes integer DEFAULT 60,
  default_price numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.service_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active templates" ON public.service_templates FOR SELECT USING (is_active = true OR is_platform_admin(auth.uid()));
CREATE POLICY "Admins manage templates" ON public.service_templates FOR ALL USING (is_platform_admin(auth.uid())) WITH CHECK (is_platform_admin(auth.uid()));

-- Update existing master_profiles to 'approved' if they were already active
UPDATE public.master_profiles SET moderation_status = 'approved' WHERE is_active = true AND moderation_status = 'draft';
UPDATE public.business_locations SET moderation_status = 'approved' WHERE is_active = true AND moderation_status = 'draft';
UPDATE public.networks SET moderation_status = 'approved' WHERE is_active = true AND moderation_status = 'draft';
