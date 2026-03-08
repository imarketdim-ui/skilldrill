
-- Technology cards for services (cost calculation)
CREATE TABLE public.technology_cards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  master_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  materials jsonb NOT NULL DEFAULT '[]'::jsonb,
  labor_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  equipment jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_material_cost numeric NOT NULL DEFAULT 0,
  total_labor_cost numeric NOT NULL DEFAULT 0,
  total_equipment_cost numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(service_id)
);

ALTER TABLE public.technology_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Masters manage own tech cards"
  ON public.technology_cards FOR ALL
  USING (master_id = auth.uid() OR is_platform_admin(auth.uid()))
  WITH CHECK (master_id = auth.uid() OR is_platform_admin(auth.uid()));

CREATE POLICY "Tech cards viewable by org members"
  ON public.technology_cards FOR SELECT
  USING (
    master_id = auth.uid()
    OR is_platform_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.business_masters bm
      JOIN public.business_locations bl ON bl.id = bm.business_id
      WHERE bm.master_id = technology_cards.master_id
      AND bl.owner_id = auth.uid()
    )
  );

-- Inventory / warehouse for businesses
CREATE TABLE public.inventory_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.business_locations(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'шт',
  quantity numeric NOT NULL DEFAULT 0,
  min_quantity numeric NOT NULL DEFAULT 0,
  price_per_unit numeric NOT NULL DEFAULT 0,
  category text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners manage inventory"
  ON public.inventory_items FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.business_locations bl WHERE bl.id = inventory_items.business_id AND bl.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.business_managers bm WHERE bm.business_id = inventory_items.business_id AND bm.user_id = auth.uid() AND bm.is_active = true)
    OR is_platform_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.business_locations bl WHERE bl.id = inventory_items.business_id AND bl.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.business_managers bm WHERE bm.business_id = inventory_items.business_id AND bm.user_id = auth.uid() AND bm.is_active = true)
    OR is_platform_admin(auth.uid())
  );

-- Inventory transactions for tracking stock movements
CREATE TABLE public.inventory_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity_change numeric NOT NULL,
  type text NOT NULL DEFAULT 'adjustment',
  description text,
  performed_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inventory transactions follow item access"
  ON public.inventory_transactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.inventory_items ii
      JOIN public.business_locations bl ON bl.id = ii.business_id
      WHERE ii.id = inventory_transactions.item_id
      AND (bl.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.business_managers bm WHERE bm.business_id = bl.id AND bm.user_id = auth.uid() AND bm.is_active = true))
    )
    OR is_platform_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inventory_items ii
      JOIN public.business_locations bl ON bl.id = ii.business_id
      WHERE ii.id = inventory_transactions.item_id
      AND (bl.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.business_managers bm WHERE bm.business_id = bl.id AND bm.user_id = auth.uid() AND bm.is_active = true))
    )
    OR is_platform_admin(auth.uid())
  );
