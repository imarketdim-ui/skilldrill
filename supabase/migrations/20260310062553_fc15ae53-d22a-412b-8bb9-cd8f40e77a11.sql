
-- 1. Add 'schema' JSONB to service_categories for niche-specific metadata
ALTER TABLE public.service_categories
  ADD COLUMN IF NOT EXISTS schema jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.service_categories.schema IS 'JSONB meta-schema describing niche-specific fields (e.g. auto: vehicle_plate, teaching: student_level)';

-- 2. Add 'custom_data' JSONB to bookings for per-booking niche data
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS custom_data jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.bookings.custom_data IS 'Niche-specific booking data filled by client (e.g. car plate number, student level)';

-- 3. Create resources table (rooms, boxes, chairs, etc.)
CREATE TABLE IF NOT EXISTS public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  capacity integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active resources"
  ON public.resources FOR SELECT
  USING (is_active = true);

CREATE POLICY "Org owners can manage resources"
  ON public.resources FOR ALL
  TO authenticated
  USING (public.is_org_owner(auth.uid(), organization_id))
  WITH CHECK (public.is_org_owner(auth.uid(), organization_id));

CREATE POLICY "Org members can manage resources"
  ON public.resources FOR ALL
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 4. Create service_assignments linking services to masters + optional resource
CREATE TABLE IF NOT EXISTS public.service_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  master_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resource_id uuid REFERENCES public.resources(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_id, master_id)
);

ALTER TABLE public.service_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active assignments"
  ON public.service_assignments FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service owner can manage assignments"
  ON public.service_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_assignments.service_id
        AND (s.master_id = auth.uid() OR public.is_org_owner(auth.uid(), s.business_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_assignments.service_id
        AND (s.master_id = auth.uid() OR public.is_org_owner(auth.uid(), s.business_id))
    )
  );

-- 5. Add optional resource_id to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS resource_id uuid REFERENCES public.resources(id) ON DELETE SET NULL;

-- 6. Auto-update updated_at on resources
CREATE TRIGGER trg_resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
