-- Canonical referral layer for subscription-based commissions

CREATE TABLE IF NOT EXISTS public.referral_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT,
  source TEXT NOT NULL DEFAULT 'signup_code',
  status TEXT NOT NULL DEFAULT 'registered',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_relationships_referrer
  ON public.referral_relationships(referrer_id, assigned_at DESC);

CREATE INDEX IF NOT EXISTS idx_referral_relationships_referred
  ON public.referral_relationships(referred_id);

ALTER TABLE public.referral_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own referral relationships"
  ON public.referral_relationships FOR SELECT
  USING (referrer_id = auth.uid() OR referred_id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.referral_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES public.referral_relationships(id) ON DELETE CASCADE,
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_kind TEXT NOT NULL DEFAULT 'subscription',
  source_entity_type TEXT NOT NULL,
  source_entity_id UUID NOT NULL,
  base_amount NUMERIC NOT NULL DEFAULT 0,
  commission_rate NUMERIC NOT NULL DEFAULT 0,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'accrued',
  reference_transaction_id UUID UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_referral_commissions_referrer
  ON public.referral_commissions(referrer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_referral_commissions_referred
  ON public.referral_commissions(referred_id, created_at DESC);

ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own referral commissions"
  ON public.referral_commissions FOR SELECT
  USING (referrer_id = auth.uid() OR referred_id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.ensure_referral_relationship_for_profile(_profile_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _referred_code TEXT;
  _referrer_id UUID;
  _relationship_id UUID;
BEGIN
  SELECT referred_by
  INTO _referred_code
  FROM public.profiles
  WHERE id = _profile_id;

  IF _referred_code IS NULL OR btrim(_referred_code) = '' THEN
    RETURN NULL;
  END IF;

  SELECT user_id
  INTO _referrer_id
  FROM public.referral_codes
  WHERE code = _referred_code
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF _referrer_id IS NULL OR _referrer_id = _profile_id THEN
    RETURN NULL;
  END IF;

  SELECT id
  INTO _relationship_id
  FROM public.referral_relationships
  WHERE referred_id = _profile_id
  LIMIT 1;

  IF _relationship_id IS NOT NULL THEN
    RETURN _relationship_id;
  END IF;

  INSERT INTO public.referral_relationships (
    referrer_id,
    referred_id,
    referral_code,
    source,
    status,
    assigned_at,
    activated_at,
    last_activity_at
  )
  VALUES (
    _referrer_id,
    _profile_id,
    _referred_code,
    'signup_code',
    'registered',
    now(),
    now(),
    now()
  )
  RETURNING id INTO _relationship_id;

  RETURN _relationship_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_referral_relationship_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referred_by IS NOT NULL
     AND (TG_OP = 'INSERT' OR COALESCE(OLD.referred_by, '') IS DISTINCT FROM COALESCE(NEW.referred_by, '')) THEN
    PERFORM public.ensure_referral_relationship_for_profile(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_referral_relationship ON public.profiles;
CREATE TRIGGER trg_sync_referral_relationship
  AFTER INSERT OR UPDATE OF referred_by ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_referral_relationship_trigger();

CREATE OR REPLACE FUNCTION public.get_referral_commission_rate(_entity_type TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE _entity_type
    WHEN 'master' THEN 0.10
    WHEN 'business' THEN 0.12
    WHEN 'network' THEN 0.15
    ELSE 0.10
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.award_referral_subscription_commission(
  _payer_user_id UUID,
  _entity_type TEXT,
  _entity_id UUID,
  _amount NUMERIC,
  _reference_transaction_id UUID DEFAULT NULL,
  _description TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _relationship RECORD;
  _commission_rate NUMERIC;
  _commission_amount NUMERIC;
BEGIN
  IF _payer_user_id IS NULL OR _entity_id IS NULL OR COALESCE(_amount, 0) <= 0 THEN
    RETURN FALSE;
  END IF;

  PERFORM public.ensure_referral_relationship_for_profile(_payer_user_id);

  SELECT rr.*
  INTO _relationship
  FROM public.referral_relationships rr
  WHERE rr.referred_id = _payer_user_id
  LIMIT 1;

  IF _relationship.id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF _reference_transaction_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.referral_commissions
    WHERE reference_transaction_id = _reference_transaction_id
  ) THEN
    RETURN FALSE;
  END IF;

  _commission_rate := public.get_referral_commission_rate(_entity_type);
  _commission_amount := round((_amount * _commission_rate)::numeric, 2);

  IF _commission_amount <= 0 THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.user_balances (user_id, main_balance, referral_balance)
  VALUES (_relationship.referrer_id, 0, _commission_amount)
  ON CONFLICT (user_id) DO UPDATE
  SET referral_balance = public.user_balances.referral_balance + EXCLUDED.referral_balance,
      updated_at = now();

  INSERT INTO public.referral_commissions (
    relationship_id,
    referrer_id,
    referred_id,
    source_kind,
    source_entity_type,
    source_entity_id,
    base_amount,
    commission_rate,
    commission_amount,
    status,
    reference_transaction_id,
    description
  )
  VALUES (
    _relationship.id,
    _relationship.referrer_id,
    _payer_user_id,
    'subscription',
    _entity_type,
    _entity_id,
    _amount,
    _commission_rate,
    _commission_amount,
    'accrued',
    _reference_transaction_id,
    COALESCE(_description, 'Реферальное вознаграждение за подписку')
  );

  INSERT INTO public.referral_earnings (referrer_id, referred_id, amount, source)
  VALUES (_relationship.referrer_id, _payer_user_id, _commission_amount, 'subscription_' || _entity_type);

  INSERT INTO public.balance_transactions (
    user_id,
    amount,
    type,
    description,
    reference_id,
    cabinet_type
  )
  VALUES (
    _relationship.referrer_id,
    _commission_amount,
    'referral_bonus',
    COALESCE(_description, 'Реферальное вознаграждение за подписку'),
    _reference_transaction_id,
    'client'
  );

  UPDATE public.referral_relationships
  SET status = 'subscribed',
      activated_at = COALESCE(activated_at, now()),
      last_activity_at = now(),
      updated_at = now()
  WHERE id = _relationship.id;

  RETURN TRUE;
END;
$$;

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
  _tx_id uuid;
BEGIN
  SELECT main_balance INTO _current_balance
  FROM user_balances
  WHERE user_id = _user_id
  FOR UPDATE;

  IF _current_balance IS NULL OR _current_balance < _amount THEN
    RETURN false;
  END IF;

  UPDATE user_balances
  SET main_balance = main_balance - _amount,
      updated_at = now()
  WHERE user_id = _user_id;

  INSERT INTO balance_transactions (user_id, amount, type, description, cabinet_type)
  VALUES (_user_id, -_amount, 'subscription_payment', _description, 'client')
  RETURNING id INTO _tx_id;

  IF _entity_type = 'master' THEN
    UPDATE master_profiles
    SET subscription_status = 'active',
        last_payment_date = now(),
        suspended_at = NULL,
        grace_start_date = NULL
    WHERE id = _entity_id;
  ELSIF _entity_type = 'business' THEN
    UPDATE business_locations
    SET subscription_status = 'active',
        last_payment_date = now(),
        suspended_at = NULL,
        grace_start_date = NULL
    WHERE id = _entity_id;
  ELSIF _entity_type = 'network' THEN
    UPDATE networks
    SET subscription_status = 'active',
        last_payment_date = now(),
        suspended_at = NULL,
        grace_start_date = NULL
    WHERE id = _entity_id;
  END IF;

  PERFORM public.award_referral_subscription_commission(
    _user_id,
    _entity_type,
    _entity_id,
    _amount,
    _tx_id,
    'Реферальное вознаграждение за подписку'
  );

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.award_referral_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _referrer_id uuid;
  _referred_code text;
  _already_awarded boolean;
  _points integer := 50;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    SELECT rr.referrer_id
    INTO _referrer_id
    FROM public.referral_relationships rr
    WHERE rr.referred_id = NEW.client_id
    LIMIT 1;

    IF _referrer_id IS NULL THEN
      SELECT referred_by INTO _referred_code
      FROM public.profiles
      WHERE id = NEW.client_id;

      IF _referred_code IS NOT NULL THEN
        SELECT user_id INTO _referrer_id
        FROM public.referral_codes
        WHERE code = _referred_code
          AND is_active = true
        ORDER BY created_at DESC
        LIMIT 1;
      END IF;
    END IF;

    IF _referrer_id IS NOT NULL AND _referrer_id <> NEW.client_id THEN
      SELECT EXISTS(
        SELECT 1
        FROM public.bonus_transactions
        WHERE user_id = _referrer_id
          AND source = 'referral'
          AND reference_id = NEW.client_id
      ) INTO _already_awarded;

      IF NOT _already_awarded THEN
        INSERT INTO public.bonus_transactions (user_id, type, amount, source, description, reference_id)
        VALUES (_referrer_id, 'earn', _points, 'referral', 'Бонус за приглашённого клиента', NEW.client_id);

        INSERT INTO public.bonus_points (user_id, balance, total_earned)
        VALUES (_referrer_id, _points, _points)
        ON CONFLICT (user_id) DO UPDATE
        SET balance = public.bonus_points.balance + _points,
            total_earned = public.bonus_points.total_earned + _points,
            updated_at = now();
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_referral_dashboard(_period TEXT DEFAULT 'month')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _from_date TIMESTAMPTZ;
  _result JSONB;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object(
      'referralCode', NULL,
      'summary', jsonb_build_object(),
      'referrals', '[]'::jsonb,
      'commissions', '[]'::jsonb,
      'series', '[]'::jsonb
    );
  END IF;

  _from_date := CASE _period
    WHEN 'week' THEN date_trunc('week', now())
    WHEN 'year' THEN date_trunc('year', now())
    ELSE date_trunc('month', now())
  END;

  _result := (
    WITH referral_rows AS (
      SELECT
        rr.id,
        rr.referred_id,
        rr.referral_code,
        rr.assigned_at,
        p.first_name,
        p.last_name,
        p.email,
        p.skillspot_id,
        au.last_sign_in_at,
        bl.id AS business_id,
        bl.name AS business_name,
        bl.subscription_status AS business_subscription_status,
        bl.last_payment_date AS business_last_payment_date,
        nw.id AS network_id,
        nw.name AS network_name,
        nw.subscription_status AS network_subscription_status,
        nw.last_payment_date AS network_last_payment_date,
        mp.id AS master_profile_id,
        mp.subscription_status AS master_subscription_status,
        mp.last_payment_date AS master_last_payment_date,
        COALESCE(comm.total_amount, 0) AS total_commission,
        COALESCE(comm.cycles, 0) AS paid_cycles,
        comm.last_commission_at
      FROM public.referral_relationships rr
      JOIN public.profiles p ON p.id = rr.referred_id
      LEFT JOIN auth.users au ON au.id = rr.referred_id
      LEFT JOIN LATERAL (
        SELECT id, name, subscription_status, last_payment_date
        FROM public.business_locations
        WHERE owner_id = rr.referred_id
          AND is_active = true
        ORDER BY
          CASE subscription_status WHEN 'active' THEN 0 WHEN 'trial' THEN 1 ELSE 2 END,
          last_payment_date DESC NULLS LAST,
          created_at DESC
        LIMIT 1
      ) bl ON true
      LEFT JOIN LATERAL (
        SELECT id, name, subscription_status, last_payment_date
        FROM public.networks
        WHERE owner_id = rr.referred_id
          AND is_active = true
        ORDER BY
          CASE subscription_status WHEN 'active' THEN 0 WHEN 'trial' THEN 1 ELSE 2 END,
          last_payment_date DESC NULLS LAST,
          created_at DESC
        LIMIT 1
      ) nw ON true
      LEFT JOIN LATERAL (
        SELECT id, subscription_status, last_payment_date
        FROM public.master_profiles
        WHERE user_id = rr.referred_id
          AND is_active = true
        ORDER BY
          CASE subscription_status WHEN 'active' THEN 0 WHEN 'trial' THEN 1 WHEN 'in_business' THEN 2 ELSE 3 END,
          last_payment_date DESC NULLS LAST,
          created_at DESC
        LIMIT 1
      ) mp ON true
      LEFT JOIN LATERAL (
        SELECT
          SUM(commission_amount) AS total_amount,
          COUNT(*) AS cycles,
          MAX(created_at) AS last_commission_at
        FROM public.referral_commissions rc
        WHERE rc.referrer_id = _user_id
          AND rc.referred_id = rr.referred_id
      ) comm ON true
      WHERE rr.referrer_id = _user_id
    ),
    summary AS (
      SELECT jsonb_build_object(
        'totalReferrals', COUNT(*),
        'paidReferrals', COUNT(*) FILTER (
          WHERE COALESCE(business_subscription_status, network_subscription_status, master_subscription_status) = 'active'
        ),
        'trialReferrals', COUNT(*) FILTER (
          WHERE COALESCE(business_subscription_status, network_subscription_status, master_subscription_status) = 'trial'
        ),
        'inactiveReferrals', COUNT(*) FILTER (
          WHERE (
            COALESCE(business_subscription_status, network_subscription_status, master_subscription_status) IS NULL
            OR COALESCE(business_subscription_status, network_subscription_status, master_subscription_status) NOT IN ('active', 'trial', 'in_business')
          )
          AND (last_sign_in_at IS NULL OR last_sign_in_at < now() - INTERVAL '30 days')
        ),
        'totalEarnings', COALESCE((SELECT SUM(commission_amount) FROM public.referral_commissions WHERE referrer_id = _user_id), 0),
        'referralBalance', COALESCE((SELECT referral_balance FROM public.user_balances WHERE user_id = _user_id), 0)
      ) AS data
      FROM referral_rows
    ),
    referrals AS (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'relationshipId', id,
          'referredUserId', referred_id,
          'displayName', COALESCE(NULLIF(btrim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')), ''), email, skillspot_id, 'Пользователь'),
          'skillspotId', skillspot_id,
          'email', email,
          'invitedAt', assigned_at,
          'lastSignInAt', last_sign_in_at,
          'targetType', CASE
            WHEN business_id IS NOT NULL THEN 'business'
            WHEN network_id IS NOT NULL THEN 'network'
            WHEN master_profile_id IS NOT NULL THEN 'master'
            ELSE 'client'
          END,
          'targetName', COALESCE(business_name, network_name, COALESCE(NULLIF(btrim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')), ''), email, skillspot_id, 'Пользователь')),
          'subscriptionStatus', COALESCE(business_subscription_status, network_subscription_status, master_subscription_status, 'registered'),
          'lastPaymentDate', COALESCE(business_last_payment_date, network_last_payment_date, master_last_payment_date),
          'engagementStatus', CASE
            WHEN COALESCE(business_subscription_status, network_subscription_status, master_subscription_status) = 'active' THEN 'paid'
            WHEN COALESCE(business_subscription_status, network_subscription_status, master_subscription_status) = 'trial' THEN 'trial'
            WHEN COALESCE(business_subscription_status, network_subscription_status, master_subscription_status) = 'in_business' THEN 'managed'
            WHEN last_sign_in_at IS NULL OR last_sign_in_at < now() - INTERVAL '30 days' THEN 'inactive'
            ELSE 'registered'
          END,
          'totalCommission', total_commission,
          'paidCycles', paid_cycles,
          'lastCommissionAt', last_commission_at
        )
        ORDER BY assigned_at DESC
      ), '[]'::jsonb) AS data
      FROM referral_rows
    ),
    commissions AS (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', rc.id,
          'referredUserId', rc.referred_id,
          'referredName', COALESCE(NULLIF(btrim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''), p.email, p.skillspot_id, 'Пользователь'),
          'amount', rc.commission_amount,
          'baseAmount', rc.base_amount,
          'rate', rc.commission_rate,
          'sourceEntityType', rc.source_entity_type,
          'status', rc.status,
          'createdAt', rc.created_at,
          'description', rc.description
        )
        ORDER BY rc.created_at DESC
      ), '[]'::jsonb) AS data
      FROM public.referral_commissions rc
      LEFT JOIN public.profiles p ON p.id = rc.referred_id
      WHERE rc.referrer_id = _user_id
    ),
    series AS (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('date', bucket_label, 'amount', bucket_amount)
        ORDER BY bucket_order
      ), '[]'::jsonb) AS data
      FROM (
        SELECT
          CASE
            WHEN _period = 'year' THEN to_char(date_trunc('month', created_at), 'Mon')
            ELSE to_char(date_trunc('day', created_at), 'DD Mon')
          END AS bucket_label,
          CASE
            WHEN _period = 'year' THEN extract(month from date_trunc('month', created_at))
            ELSE extract(epoch from date_trunc('day', created_at))
          END AS bucket_order,
          SUM(commission_amount) AS bucket_amount
        FROM public.referral_commissions
        WHERE referrer_id = _user_id
          AND created_at >= _from_date
        GROUP BY 1, 2
      ) grouped
    )
    SELECT jsonb_build_object(
      'referralCode', (SELECT code FROM public.referral_codes WHERE user_id = _user_id AND is_active = true ORDER BY created_at DESC LIMIT 1),
      'summary', (SELECT data FROM summary),
      'referrals', (SELECT data FROM referrals),
      'commissions', (SELECT data FROM commissions),
      'series', (SELECT data FROM series)
    )
  );

  RETURN _result;
END;
$$;

-- Backfill canonical relationships for already invited users
SELECT public.ensure_referral_relationship_for_profile(id)
FROM public.profiles
WHERE referred_by IS NOT NULL
  AND btrim(referred_by) <> '';
