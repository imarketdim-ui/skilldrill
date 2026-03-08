-- Auto-deduct inventory when a booking completes (if tech card exists)
-- Tech cards are stored as JSON on services, so we look up the service's materials

CREATE OR REPLACE FUNCTION public.auto_deduct_inventory_on_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _service_id uuid;
  _org_id uuid;
  _tech_card jsonb;
  _material jsonb;
  _item_id uuid;
  _qty numeric;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    _service_id := NEW.service_id;
    _org_id := NEW.organization_id;

    -- Get tech_card from service
    SELECT tech_card INTO _tech_card FROM services WHERE id = _service_id;

    IF _tech_card IS NOT NULL AND jsonb_typeof(_tech_card) = 'array' THEN
      FOR _material IN SELECT * FROM jsonb_array_elements(_tech_card)
      LOOP
        _item_id := (_material->>'inventory_item_id')::uuid;
        _qty := (_material->>'quantity')::numeric;

        IF _item_id IS NOT NULL AND _qty IS NOT NULL AND _qty > 0 THEN
          -- Deduct from inventory
          UPDATE inventory_items
          SET quantity = GREATEST(quantity - _qty, 0),
              updated_at = now()
          WHERE id = _item_id AND business_id = _org_id;

          -- Log the transaction
          INSERT INTO inventory_transactions (item_id, quantity_change, type, performed_by, description)
          VALUES (_item_id, -_qty, 'consumption', NEW.executor_id, 'Авто-списание: ' || (SELECT name FROM services WHERE id = _service_id));
        END IF;
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_deduct_on_complete ON bookings;
CREATE TRIGGER trg_inventory_deduct_on_complete
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_deduct_inventory_on_complete();

-- Auto-create finance record (income + commission) when booking completes
CREATE OR REPLACE FUNCTION public.auto_finance_on_booking_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _price numeric;
  _commission numeric := 0;
  _rule record;
  _service_name text;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    -- Get service price
    SELECT price, name INTO _price, _service_name FROM services WHERE id = NEW.service_id;
    IF _price IS NULL OR _price <= 0 THEN RETURN NEW; END IF;

    -- Find applicable commission rule (highest priority)
    SELECT commission_percent INTO _rule FROM business_commission_rules
    WHERE business_id = NEW.organization_id AND is_active = true
      AND (
        (rule_type = 'service' AND service_id = NEW.service_id) OR
        (rule_type = 'master' AND master_id = NEW.executor_id) OR
        (rule_type = 'category' AND category_id = (SELECT category_id FROM services WHERE id = NEW.service_id)) OR
        (rule_type = 'default')
      )
    ORDER BY priority DESC
    LIMIT 1;

    _commission := COALESCE(_rule.commission_percent, 0);

    -- Record income for business
    INSERT INTO business_finances (business_id, type, category, sub_type, amount, description, master_id, date)
    VALUES (NEW.organization_id, 'income', 'Услуги', 'service_payment', _price, _service_name, NEW.executor_id, CURRENT_DATE);

    -- Record commission expense if applicable
    IF _commission > 0 THEN
      INSERT INTO business_finances (business_id, type, category, sub_type, amount, description, master_id, date)
      VALUES (NEW.organization_id, 'expense', 'Зарплата', 'master_payout', ROUND(_price * (100 - _commission) / 100, 2), 'Выплата мастеру: ' || _service_name, NEW.executor_id, CURRENT_DATE);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_finance_on_booking_complete ON bookings;
CREATE TRIGGER trg_finance_on_booking_complete
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_finance_on_booking_complete();