
-- Commission rules table for multi-criteria business commissions
CREATE TABLE public.business_commission_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.business_locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL DEFAULT 'default', -- 'default', 'master', 'category', 'service'
  master_id UUID REFERENCES public.profiles(id),
  category_id UUID REFERENCES public.service_categories(id),
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  commission_percent NUMERIC NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 0, -- higher = more specific
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.business_commission_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners manage commission rules"
ON public.business_commission_rules FOR ALL
USING (
  EXISTS (SELECT 1 FROM business_locations bl WHERE bl.id = business_commission_rules.business_id AND bl.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM business_managers bm WHERE bm.business_id = business_commission_rules.business_id AND bm.user_id = auth.uid() AND bm.is_active = true)
  OR is_platform_admin(auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM business_locations bl WHERE bl.id = business_commission_rules.business_id AND bl.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM business_managers bm WHERE bm.business_id = business_commission_rules.business_id AND bm.user_id = auth.uid() AND bm.is_active = true)
  OR is_platform_admin(auth.uid())
);

-- Add cash_balance to business_locations for cash register tracking
ALTER TABLE public.business_locations ADD COLUMN IF NOT EXISTS cash_balance NUMERIC NOT NULL DEFAULT 0;

-- Expand business_finances: add sub_type for more granular tracking
ALTER TABLE public.business_finances ADD COLUMN IF NOT EXISTS sub_type TEXT;
-- sub_type examples: 'service_payment', 'product_sale', 'cash_collection', 'cash_deposit', 'refund', 'salary', etc.
