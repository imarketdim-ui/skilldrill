
-- Add business_id to services for business-owned services
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.business_locations(id);

-- RLS policy: business owners can manage services linked to their business
CREATE POLICY "Business owners manage business services"
ON public.services
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.business_locations bl
    WHERE bl.id = services.business_id AND bl.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.business_managers bm
    WHERE bm.business_id = services.business_id AND bm.user_id = auth.uid() AND bm.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.business_locations bl
    WHERE bl.id = services.business_id AND bl.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.business_managers bm
    WHERE bm.business_id = services.business_id AND bm.user_id = auth.uid() AND bm.is_active = true
  )
);
