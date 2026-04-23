
-- E. Push subscriptions: убираем UNIQUE(user_id), добавляем UNIQUE(endpoint)
ALTER TABLE public.push_subscriptions
  DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_key
  ON public.push_subscriptions (endpoint);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_active_idx
  ON public.push_subscriptions (user_id) WHERE is_active = true;

-- D. Идемпотентность Tinkoff: payment_id уникален среди бронирований где он установлен
CREATE UNIQUE INDEX IF NOT EXISTS bookings_payment_id_unique_idx
  ON public.bookings (payment_id) WHERE payment_id IS NOT NULL;

-- C. Atomic hold для платной маркетинговой кампании
CREATE OR REPLACE FUNCTION public.create_paid_campaign(
  _business_id uuid,
  _title text,
  _message text,
  _audience_filter text,
  _include_own_clients boolean,
  _target_count integer,
  _cost_per_client numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _current_balance numeric;
  _total_cost numeric;
  _campaign_id uuid;
  _is_owner boolean;
BEGIN
  -- 1. Auth
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  -- 2. Validate inputs
  IF _title IS NULL OR length(trim(_title)) = 0 THEN
    RAISE EXCEPTION 'Title required' USING ERRCODE = '22023';
  END IF;
  IF _message IS NULL OR length(trim(_message)) = 0 THEN
    RAISE EXCEPTION 'Message required' USING ERRCODE = '22023';
  END IF;
  IF _target_count IS NULL OR _target_count <= 0 THEN
    RAISE EXCEPTION 'target_count must be > 0' USING ERRCODE = '22023';
  END IF;
  IF _target_count > 100000 THEN
    RAISE EXCEPTION 'target_count too large' USING ERRCODE = '22023';
  END IF;
  IF _cost_per_client IS NULL OR _cost_per_client <= 0 THEN
    RAISE EXCEPTION 'cost_per_client must be > 0' USING ERRCODE = '22023';
  END IF;

  -- 3. Authorization: business must belong to caller (or caller is admin)
  SELECT EXISTS(
    SELECT 1 FROM business_locations
    WHERE id = _business_id AND owner_id = _user_id
  ) INTO _is_owner;

  IF NOT _is_owner AND NOT is_platform_admin(_user_id) THEN
    RAISE EXCEPTION 'Forbidden: not business owner' USING ERRCODE = '42501';
  END IF;

  _total_cost := _target_count * _cost_per_client;

  -- 4. Lock balance row, ensure exists
  INSERT INTO user_balances (user_id, main_balance)
  VALUES (_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT main_balance INTO _current_balance
  FROM user_balances
  WHERE user_id = _user_id
  FOR UPDATE;

  IF _current_balance IS NULL OR _current_balance < _total_cost THEN
    RAISE EXCEPTION 'Insufficient funds: need %, have %', _total_cost, COALESCE(_current_balance, 0)
      USING ERRCODE = 'P0001';
  END IF;

  -- 5. Atomic deduct
  UPDATE user_balances
    SET main_balance = main_balance - _total_cost,
        updated_at = now()
    WHERE user_id = _user_id;

  -- 6. Create campaign FIRST so we can reference its id
  INSERT INTO marketing_campaigns (
    creator_id, business_id, title, message,
    target_type, audience_filter, include_own_clients,
    target_count, cost_per_client, total_cost,
    hold_amount, hold_released, status
  ) VALUES (
    _user_id, _business_id, trim(_title), trim(_message),
    'skillspot_clients', _audience_filter, _include_own_clients,
    _target_count, _cost_per_client, _total_cost,
    _total_cost, false, 'pending_moderation'
  )
  RETURNING id INTO _campaign_id;

  -- 7. Record balance transaction (links to campaign)
  INSERT INTO balance_transactions (
    user_id, amount, type, description, reference_id
  ) VALUES (
    _user_id, -_total_cost, 'campaign_hold',
    'Холд за рассылку: ' || trim(_title),
    _campaign_id::text
  );

  RETURN jsonb_build_object(
    'campaign_id', _campaign_id,
    'hold_amount', _total_cost,
    'remaining_balance', _current_balance - _total_cost
  );
END;
$$;

-- Refund hold (used on rejection / cancellation)
CREATE OR REPLACE FUNCTION public.refund_campaign_hold(_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _campaign RECORD;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO _campaign FROM marketing_campaigns
    WHERE id = _campaign_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign not found' USING ERRCODE = 'P0002';
  END IF;

  -- Only creator or admin can refund. Sent campaigns cannot be refunded.
  IF _campaign.creator_id <> _user_id AND NOT is_platform_admin(_user_id) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF COALESCE(_campaign.hold_released, false) THEN
    RETURN jsonb_build_object('already_released', true);
  END IF;

  IF _campaign.status = 'sent' THEN
    RAISE EXCEPTION 'Cannot refund a sent campaign' USING ERRCODE = 'P0001';
  END IF;

  IF COALESCE(_campaign.hold_amount, 0) > 0 THEN
    UPDATE user_balances
      SET main_balance = main_balance + _campaign.hold_amount,
          updated_at = now()
      WHERE user_id = _campaign.creator_id;

    INSERT INTO balance_transactions (
      user_id, amount, type, description, reference_id
    ) VALUES (
      _campaign.creator_id, _campaign.hold_amount,
      'campaign_refund', 'Возврат холда за рассылку',
      _campaign.id::text
    );
  END IF;

  UPDATE marketing_campaigns
    SET hold_released = true,
        status = CASE WHEN status = 'pending_moderation' THEN 'cancelled' ELSE status END,
        updated_at = now()
    WHERE id = _campaign.id;

  RETURN jsonb_build_object('refunded', COALESCE(_campaign.hold_amount, 0));
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_paid_campaign(uuid, text, text, text, boolean, integer, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_campaign_hold(uuid) TO authenticated;
