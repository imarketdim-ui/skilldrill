-- Cash registers table (multiple per business: cash, card, terminal, master wallet)
CREATE TABLE cash_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES business_locations(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'cash', -- 'cash', 'card', 'terminal', 'bank_account'
  balance numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Cash register transactions (all money movements)
CREATE TABLE cash_register_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  register_id uuid NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'income', 'expense', 'transfer_in', 'transfer_out', 'encashment'
  category text NOT NULL, -- 'service_payment', 'product_sale', 'procurement', 'salary', 'rent', 'utilities', 'transfer', etc
  amount numeric NOT NULL,
  description text,
  reference_type text, -- 'booking', 'inventory_transaction', 'product_sale'
  reference_id uuid,
  performed_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Product sales (for retail/materials sale to clients)
CREATE TABLE product_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES business_locations(id) ON DELETE CASCADE,
  item_id uuid REFERENCES inventory_items(id),
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  client_id uuid REFERENCES profiles(id),
  register_id uuid REFERENCES cash_registers(id),
  sold_by uuid NOT NULL REFERENCES profiles(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Auto write-off settings for business
ALTER TABLE business_locations ADD COLUMN IF NOT EXISTS auto_writeoff_enabled boolean NOT NULL DEFAULT false;

-- RLS for cash_registers
ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners managers manage registers" ON cash_registers
FOR ALL USING (
  (EXISTS (SELECT 1 FROM business_locations bl WHERE bl.id = cash_registers.business_id AND bl.owner_id = auth.uid()))
  OR (EXISTS (SELECT 1 FROM business_managers bm WHERE bm.business_id = cash_registers.business_id AND bm.user_id = auth.uid() AND bm.is_active = true))
  OR is_platform_admin(auth.uid())
)
WITH CHECK (
  (EXISTS (SELECT 1 FROM business_locations bl WHERE bl.id = cash_registers.business_id AND bl.owner_id = auth.uid()))
  OR (EXISTS (SELECT 1 FROM business_managers bm WHERE bm.business_id = cash_registers.business_id AND bm.user_id = auth.uid() AND bm.is_active = true))
  OR is_platform_admin(auth.uid())
);

-- RLS for cash_register_transactions
ALTER TABLE cash_register_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners managers manage transactions" ON cash_register_transactions
FOR ALL USING (
  (EXISTS (
    SELECT 1 FROM cash_registers cr
    JOIN business_locations bl ON bl.id = cr.business_id
    WHERE cr.id = cash_register_transactions.register_id
    AND (bl.owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM business_managers bm WHERE bm.business_id = bl.id AND bm.user_id = auth.uid() AND bm.is_active = true
    ))
  ))
  OR is_platform_admin(auth.uid())
)
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM cash_registers cr
    JOIN business_locations bl ON bl.id = cr.business_id
    WHERE cr.id = cash_register_transactions.register_id
    AND (bl.owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM business_managers bm WHERE bm.business_id = bl.id AND bm.user_id = auth.uid() AND bm.is_active = true
    ))
  ))
  OR is_platform_admin(auth.uid())
);

-- RLS for product_sales
ALTER TABLE product_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners managers manage sales" ON product_sales
FOR ALL USING (
  (EXISTS (SELECT 1 FROM business_locations bl WHERE bl.id = product_sales.business_id AND bl.owner_id = auth.uid()))
  OR (EXISTS (SELECT 1 FROM business_managers bm WHERE bm.business_id = product_sales.business_id AND bm.user_id = auth.uid() AND bm.is_active = true))
  OR is_platform_admin(auth.uid())
)
WITH CHECK (
  (EXISTS (SELECT 1 FROM business_locations bl WHERE bl.id = product_sales.business_id AND bl.owner_id = auth.uid()))
  OR (EXISTS (SELECT 1 FROM business_managers bm WHERE bm.business_id = product_sales.business_id AND bm.user_id = auth.uid() AND bm.is_active = true))
  OR is_platform_admin(auth.uid())
);

-- Index for fast lookups
CREATE INDEX idx_cash_registers_business ON cash_registers(business_id);
CREATE INDEX idx_cash_register_transactions_register ON cash_register_transactions(register_id);
CREATE INDEX idx_product_sales_business ON product_sales(business_id);