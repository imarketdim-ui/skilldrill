
-- BUG-NEW-001: Create restricted view for master access to client scores
CREATE OR REPLACE VIEW public.user_scores_master_view AS
SELECT 
  user_id,
  total_score,
  profile_score,
  activity_score,
  completed_visits,
  no_show_count,
  cancel_under_1h,
  cancel_under_3h,
  total_cancellations,
  disputes_total,
  disputes_won,
  disputes_lost,
  vip_by_count,
  blacklist_by_count,
  unique_partners,
  top_partner_pct,
  has_full_name,
  has_photo,
  kyc_verified,
  status,
  account_age_days,
  last_calculated_at
FROM public.user_scores;

-- BUG-NEW-006: Atomic subscription payment RPC
CREATE OR REPLACE FUNCTION public.pay_subscription_from_balance(
  _user_id uuid,
  _entity_type text,
  _entity_id uuid,
  _amount numeric,
  _description text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_balance numeric;
BEGIN
  -- Lock the balance row
  SELECT main_balance INTO _current_balance
  FROM user_balances
  WHERE user_id = _user_id
  FOR UPDATE;

  IF _current_balance IS NULL OR _current_balance < _amount THEN
    RETURN false;
  END IF;

  -- Deduct balance
  UPDATE user_balances SET main_balance = main_balance - _amount WHERE user_id = _user_id;

  -- Record transaction
  INSERT INTO balance_transactions (user_id, amount, type, description)
  VALUES (_user_id, -_amount, 'subscription_payment', _description);

  -- Activate subscription
  IF _entity_type = 'master' THEN
    UPDATE master_profiles SET subscription_status = 'active', last_payment_date = now(), suspended_at = NULL, grace_start_date = NULL WHERE id = _entity_id;
  ELSIF _entity_type = 'business' THEN
    UPDATE business_locations SET subscription_status = 'active', last_payment_date = now(), suspended_at = NULL, grace_start_date = NULL WHERE id = _entity_id;
  ELSIF _entity_type = 'network' THEN
    UPDATE networks SET subscription_status = 'active', last_payment_date = now(), suspended_at = NULL, grace_start_date = NULL WHERE id = _entity_id;
  END IF;

  RETURN true;
END;
$$;
