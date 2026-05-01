CREATE OR REPLACE FUNCTION public.can_view_business_context(_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_locations bl
    WHERE bl.id = _business_id
      AND (
        bl.owner_id = auth.uid()
        OR public.is_business_admin_of(auth.uid(), _business_id)
        OR EXISTS (
          SELECT 1
          FROM public.business_managers bm
          WHERE bm.business_id = _business_id
            AND bm.user_id = auth.uid()
            AND bm.is_active = true
        )
        OR EXISTS (
          SELECT 1
          FROM public.business_masters bm
          WHERE bm.business_id = _business_id
            AND bm.master_id = auth.uid()
            AND bm.status = 'accepted'
        )
        OR public.is_platform_admin(auth.uid())
        OR public.is_super_admin(auth.uid())
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_business_context(_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_locations bl
    WHERE bl.id = _business_id
      AND (
        bl.owner_id = auth.uid()
        OR public.is_business_admin_of(auth.uid(), _business_id)
        OR EXISTS (
          SELECT 1
          FROM public.business_managers bm
          WHERE bm.business_id = _business_id
            AND bm.user_id = auth.uid()
            AND bm.is_active = true
        )
        OR public.is_platform_admin(auth.uid())
        OR public.is_super_admin(auth.uid())
      )
  );
$$;

DROP POLICY IF EXISTS "Active services are viewable by everyone" ON public.services;
CREATE POLICY "Active services are viewable by everyone"
ON public.services FOR SELECT
USING (
  is_active = true
  OR (business_id IS NOT NULL AND public.can_view_business_context(business_id))
  OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
);

DROP POLICY IF EXISTS "Org members with permission can manage services" ON public.services;
DROP POLICY IF EXISTS "Business owners manage business services" ON public.services;
DROP POLICY IF EXISTS "business_admin can manage services" ON public.services;
DROP POLICY IF EXISTS "Masters manage own services" ON public.services;

CREATE POLICY "Business and masters manage services"
ON public.services FOR ALL
USING (
  (business_id IS NOT NULL AND public.can_manage_business_context(business_id))
  OR (
    business_id IS NULL
    AND (
      (organization_id IS NOT NULL AND (public.is_org_owner(auth.uid(), organization_id) OR public.has_org_permission(auth.uid(), organization_id, 'services:manage')))
      OR master_id = auth.uid()
      OR public.is_platform_admin(auth.uid())
      OR public.is_super_admin(auth.uid())
    )
  )
)
WITH CHECK (
  (business_id IS NOT NULL AND public.can_manage_business_context(business_id))
  OR (
    business_id IS NULL
    AND (
      (organization_id IS NOT NULL AND (public.is_org_owner(auth.uid(), organization_id) OR public.has_org_permission(auth.uid(), organization_id, 'services:manage')))
      OR master_id = auth.uid()
      OR public.is_platform_admin(auth.uid())
      OR public.is_super_admin(auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Service cards viewable by org members" ON public.service_cards;
CREATE POLICY "Service cards viewable by org members"
ON public.service_cards FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.services s
    WHERE s.id = service_id
      AND (
        (s.business_id IS NOT NULL AND public.can_view_business_context(s.business_id))
        OR (s.organization_id IS NOT NULL AND public.is_org_member(auth.uid(), s.organization_id))
      )
  )
);

DROP POLICY IF EXISTS "Org members with permission can manage service cards" ON public.service_cards;
CREATE POLICY "Business and masters manage service cards"
ON public.service_cards FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.services s
    WHERE s.id = service_id
      AND (
        (s.business_id IS NOT NULL AND public.can_manage_business_context(s.business_id))
        OR (
          s.business_id IS NULL
          AND (
            (s.organization_id IS NOT NULL AND (public.is_org_owner(auth.uid(), s.organization_id) OR public.has_org_permission(auth.uid(), s.organization_id, 'services:manage')))
            OR s.master_id = auth.uid()
            OR public.is_platform_admin(auth.uid())
            OR public.is_super_admin(auth.uid())
          )
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.services s
    WHERE s.id = service_id
      AND (
        (s.business_id IS NOT NULL AND public.can_manage_business_context(s.business_id))
        OR (
          s.business_id IS NULL
          AND (
            (s.organization_id IS NOT NULL AND (public.is_org_owner(auth.uid(), s.organization_id) OR public.has_org_permission(auth.uid(), s.organization_id, 'services:manage')))
            OR s.master_id = auth.uid()
            OR public.is_platform_admin(auth.uid())
            OR public.is_super_admin(auth.uid())
          )
        )
      )
  )
);

DROP POLICY IF EXISTS "Service executors viewable by org members" ON public.service_executors;
CREATE POLICY "Service executors viewable by org members"
ON public.service_executors FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.services s
    WHERE s.id = service_id
      AND (
        (s.business_id IS NOT NULL AND public.can_view_business_context(s.business_id))
        OR (s.organization_id IS NOT NULL AND public.is_org_member(auth.uid(), s.organization_id))
      )
  )
);

DROP POLICY IF EXISTS "Org members with permission can manage service executors" ON public.service_executors;
CREATE POLICY "Business and masters manage service executors"
ON public.service_executors FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.services s
    WHERE s.id = service_id
      AND (
        (s.business_id IS NOT NULL AND public.can_manage_business_context(s.business_id))
        OR (
          s.business_id IS NULL
          AND (
            (s.organization_id IS NOT NULL AND (public.is_org_owner(auth.uid(), s.organization_id) OR public.has_org_permission(auth.uid(), s.organization_id, 'services:manage')))
            OR s.master_id = auth.uid()
            OR public.is_platform_admin(auth.uid())
            OR public.is_super_admin(auth.uid())
          )
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.services s
    WHERE s.id = service_id
      AND (
        (s.business_id IS NOT NULL AND public.can_manage_business_context(s.business_id))
        OR (
          s.business_id IS NULL
          AND (
            (s.organization_id IS NOT NULL AND (public.is_org_owner(auth.uid(), s.organization_id) OR public.has_org_permission(auth.uid(), s.organization_id, 'services:manage')))
            OR s.master_id = auth.uid()
            OR public.is_platform_admin(auth.uid())
            OR public.is_super_admin(auth.uid())
          )
        )
      )
  )
);

DROP POLICY IF EXISTS "Masters manage own tech cards" ON public.technology_cards;
CREATE POLICY "Business and masters manage tech cards"
ON public.technology_cards FOR ALL
USING (
  master_id = auth.uid()
  OR public.is_platform_admin(auth.uid())
  OR public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.services s
    WHERE s.id = technology_cards.service_id
      AND s.business_id IS NOT NULL
      AND public.can_manage_business_context(s.business_id)
  )
)
WITH CHECK (
  master_id = auth.uid()
  OR public.is_platform_admin(auth.uid())
  OR public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.services s
    WHERE s.id = technology_cards.service_id
      AND s.business_id IS NOT NULL
      AND public.can_manage_business_context(s.business_id)
  )
);
