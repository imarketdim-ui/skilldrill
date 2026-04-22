CREATE OR REPLACE FUNCTION public.is_business_admin_of(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_managers bm
    JOIN public.user_roles ur ON ur.user_id = bm.user_id
    WHERE bm.user_id = _user_id
      AND bm.business_id = _business_id
      AND bm.is_active = true
      AND ur.role = 'business_admin'
      AND ur.is_active = true
  )
$$;

DROP POLICY IF EXISTS "business_admin can view their location" ON public.business_locations;
CREATE POLICY "business_admin can view their location"
ON public.business_locations FOR SELECT
USING (public.is_business_admin_of(auth.uid(), id));

DROP POLICY IF EXISTS "business_admin can update their location" ON public.business_locations;
CREATE POLICY "business_admin can update their location"
ON public.business_locations FOR UPDATE
USING (public.is_business_admin_of(auth.uid(), id));

DROP POLICY IF EXISTS "business_admin can manage services" ON public.services;
CREATE POLICY "business_admin can manage services"
ON public.services FOR ALL
USING (organization_id IS NOT NULL AND public.is_business_admin_of(auth.uid(), organization_id))
WITH CHECK (organization_id IS NOT NULL AND public.is_business_admin_of(auth.uid(), organization_id));

DROP POLICY IF EXISTS "business_admin can manage bookings" ON public.bookings;
CREATE POLICY "business_admin can manage bookings"
ON public.bookings FOR ALL
USING (organization_id IS NOT NULL AND public.is_business_admin_of(auth.uid(), organization_id))
WITH CHECK (organization_id IS NOT NULL AND public.is_business_admin_of(auth.uid(), organization_id));

DROP POLICY IF EXISTS "business_admin can manage finances" ON public.business_finances;
CREATE POLICY "business_admin can manage finances"
ON public.business_finances FOR ALL
USING (public.is_business_admin_of(auth.uid(), business_id))
WITH CHECK (public.is_business_admin_of(auth.uid(), business_id));

DROP POLICY IF EXISTS "business_admin can manage inventory" ON public.inventory_items;
CREATE POLICY "business_admin can manage inventory"
ON public.inventory_items FOR ALL
USING (public.is_business_admin_of(auth.uid(), business_id))
WITH CHECK (public.is_business_admin_of(auth.uid(), business_id));

DROP POLICY IF EXISTS "business_admin can manage cash registers" ON public.cash_registers;
CREATE POLICY "business_admin can manage cash registers"
ON public.cash_registers FOR ALL
USING (public.is_business_admin_of(auth.uid(), business_id))
WITH CHECK (public.is_business_admin_of(auth.uid(), business_id));

DROP POLICY IF EXISTS "business_admin can manage masters" ON public.business_masters;
CREATE POLICY "business_admin can manage masters"
ON public.business_masters FOR ALL
USING (public.is_business_admin_of(auth.uid(), business_id))
WITH CHECK (public.is_business_admin_of(auth.uid(), business_id));

CREATE OR REPLACE FUNCTION public.cleanup_typing_indicators()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.typing_indicators WHERE created_at < now() - interval '10 seconds';
$$;