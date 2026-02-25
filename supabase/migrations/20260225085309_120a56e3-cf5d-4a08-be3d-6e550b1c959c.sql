
-- =============================================
-- 1. ADD LAT/LNG TO master_profiles AND business_locations
-- =============================================
ALTER TABLE public.master_profiles
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE public.business_locations
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- =============================================
-- 2. USER SCORES TABLE
-- =============================================
CREATE TABLE public.user_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Final score 0-100
  total_score numeric NOT NULL DEFAULT 60,
  
  -- Block scores
  profile_score numeric NOT NULL DEFAULT 0,
  activity_score numeric NOT NULL DEFAULT 0,
  risk_score numeric NOT NULL DEFAULT 0,
  reputation_score numeric NOT NULL DEFAULT 0,
  
  -- Raw metrics
  completed_visits integer NOT NULL DEFAULT 0,
  no_show_count integer NOT NULL DEFAULT 0,
  cancel_under_1h integer NOT NULL DEFAULT 0,
  cancel_under_3h integer NOT NULL DEFAULT 0,
  total_cancellations integer NOT NULL DEFAULT 0,
  disputes_total integer NOT NULL DEFAULT 0,
  disputes_won integer NOT NULL DEFAULT 0,
  disputes_lost integer NOT NULL DEFAULT 0,
  vip_by_count integer NOT NULL DEFAULT 0,
  blacklist_by_count integer NOT NULL DEFAULT 0,
  unique_partners integer NOT NULL DEFAULT 0,
  top_partner_pct numeric NOT NULL DEFAULT 0,
  
  -- Profile checks
  has_full_name boolean NOT NULL DEFAULT false,
  has_photo boolean NOT NULL DEFAULT false,
  
  -- Status: 'insufficient_data', 'active', 'flagged', 'restricted', 'blocked'
  status text NOT NULL DEFAULT 'insufficient_data',
  
  account_age_days integer NOT NULL DEFAULT 0,
  last_calculated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_scores ENABLE ROW LEVEL SECURITY;

-- Users can read their own score
CREATE POLICY "own_score_select" ON public.user_scores
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admins can see all scores
CREATE POLICY "admin_score_select" ON public.user_scores
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- Masters can see scores of their clients (via bookings)
CREATE POLICY "master_score_select" ON public.user_scores
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.client_id = user_scores.user_id
        AND b.executor_id = auth.uid()
    )
  );

-- System/user can upsert own score
CREATE POLICY "score_upsert" ON public.user_scores
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin can manage all scores
CREATE POLICY "admin_score_manage" ON public.user_scores
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_user_scores_updated_at
  BEFORE UPDATE ON public.user_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 3. CALCULATE USER SCORE FUNCTION
-- Adapted from Skill project to use SkillSpot's tables:
--   bookings (client_id, executor_id, scheduled_at, status)
--   ratings (rater_id, rated_id, score, booking_id)
--   blacklists (blocker_id, blocked_id)
--   disputes (initiator_id, respondent_id, status, resolution)
--   profiles (first_name, last_name, avatar_url, created_at)
-- =============================================
CREATE OR REPLACE FUNCTION public.calculate_user_score(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile_score numeric := 0;
  _activity_score numeric := 0;
  _risk_score numeric := 0;
  _reputation_score numeric := 0;
  _total_score numeric;
  _completed integer := 0;
  _no_shows integer := 0;
  _cancel_u1h integer := 0;
  _cancel_u3h integer := 0;
  _total_cancel integer := 0;
  _disputes_t integer := 0;
  _disputes_w integer := 0;
  _disputes_l integer := 0;
  _vip_count integer := 0;
  _bl_count integer := 0;
  _unique_partners integer := 0;
  _top_partner_pct numeric := 0;
  _has_name boolean := false;
  _has_photo boolean := false;
  _account_days integer := 0;
  _status text;
  _rate numeric;
  _result jsonb;
BEGIN
  -- === PROFILE BLOCK (max +20) ===
  SELECT
    COALESCE((COALESCE(p.first_name, '') != '' AND COALESCE(p.last_name, '') != ''), false),
    COALESCE((p.avatar_url IS NOT NULL AND p.avatar_url != ''), false),
    COALESCE(GREATEST(0, EXTRACT(DAY FROM now() - p.created_at))::integer, 0)
  INTO _has_name, _has_photo, _account_days
  FROM profiles p WHERE p.id = _user_id;

  IF _has_name AND _has_photo THEN _profile_score := _profile_score + 5; END IF;
  IF _has_name AND _has_photo AND _account_days > 30 THEN
    _profile_score := _profile_score + 10;
  END IF;

  -- === ACTIVITY BLOCK (max +15) ===
  SELECT COALESCE(COUNT(*), 0) INTO _completed
  FROM bookings WHERE client_id = _user_id AND status = 'completed';

  IF _completed >= 100 THEN _activity_score := 10;
  ELSIF _completed >= 50 THEN _activity_score := 5;
  END IF;
  IF _account_days >= 90 THEN _activity_score := _activity_score + 5; END IF;
  _activity_score := LEAST(_activity_score, 15);

  -- === VIP count (ratings >= 4 from masters about this client) ===
  SELECT COALESCE(COUNT(*), 0) INTO _vip_count
  FROM ratings WHERE rated_id = _user_id AND score >= 4;

  -- === Blacklist count ===
  SELECT COALESCE(COUNT(*), 0) INTO _bl_count
  FROM blacklists WHERE blocked_id = _user_id;

  -- === Unique partners ===
  SELECT COALESCE(COUNT(DISTINCT executor_id), 0),
         CASE WHEN COUNT(DISTINCT executor_id) > 0
              THEN COALESCE((MAX(partner_count)::numeric / NULLIF(COUNT(*), 0)::numeric) * 100, 0)
              ELSE 0 END
  INTO _unique_partners, _top_partner_pct
  FROM (
    SELECT executor_id, COUNT(*) as partner_count
    FROM bookings WHERE client_id = _user_id AND status = 'completed'
    GROUP BY executor_id
  ) sub;

  -- === RISK BLOCK (max 0, min -80) ===
  IF _completed >= 20 THEN
    -- No-shows: past bookings not completed and not cancelled
    SELECT COALESCE(COUNT(*), 0) INTO _no_shows
    FROM bookings WHERE client_id = _user_id AND scheduled_at < now() AND status NOT IN ('completed', 'cancelled');

    -- Cancellations
    SELECT COALESCE(COUNT(*), 0) INTO _total_cancel
    FROM bookings WHERE client_id = _user_id AND status = 'cancelled';

    -- Cancel under 1h and under 3h (scheduled_at - updated_at as proxy for cancel timing)
    SELECT
      COALESCE(COUNT(*) FILTER (WHERE scheduled_at - updated_at < interval '1 hour' AND scheduled_at - updated_at > interval '0'), 0),
      COALESCE(COUNT(*) FILTER (WHERE scheduled_at - updated_at < interval '3 hours' AND scheduled_at - updated_at >= interval '1 hour'), 0)
    INTO _cancel_u1h, _cancel_u3h
    FROM bookings WHERE client_id = _user_id AND status = 'cancelled';

    -- No-show rate penalty
    _rate := CASE WHEN _completed > 0 THEN (_no_shows::numeric / _completed) * 100 ELSE 0 END;
    IF _rate > 20 THEN _risk_score := _risk_score - 30;
    ELSIF _rate > 10 THEN _risk_score := _risk_score - 15;
    ELSIF _rate > 5 THEN _risk_score := _risk_score - 7;
    ELSIF _rate > 2 THEN _risk_score := _risk_score - 3;
    END IF;

    -- Cancel <1h rate penalty
    _rate := CASE WHEN _completed > 0 THEN (_cancel_u1h::numeric / _completed) * 100 ELSE 0 END;
    IF _rate > 15 THEN _risk_score := _risk_score - 15;
    ELSIF _rate > 7 THEN _risk_score := _risk_score - 8;
    ELSIF _rate > 3 THEN _risk_score := _risk_score - 3;
    END IF;

    -- Disputes (using disputes table)
    SELECT COALESCE(COUNT(*), 0),
           COALESCE(COUNT(*) FILTER (WHERE status = 'resolved_for_initiator'), 0),
           COALESCE(COUNT(*) FILTER (WHERE status = 'resolved_for_respondent'), 0)
    INTO _disputes_t, _disputes_w, _disputes_l
    FROM disputes WHERE initiator_id = _user_id OR respondent_id = _user_id;

    _rate := CASE WHEN _completed > 0 THEN (_disputes_l::numeric / _completed) * 100 ELSE 0 END;
    IF _rate > 20 THEN _risk_score := _risk_score - 30;
    ELSIF _rate > 10 THEN _risk_score := _risk_score - 15;
    ELSIF _rate > 0 THEN _risk_score := _risk_score - 5;
    END IF;

    -- Blacklist penalty (capped at -25)
    _risk_score := _risk_score - LEAST(_bl_count * 5, 25);
  END IF;

  _risk_score := GREATEST(_risk_score, -80);

  -- === REPUTATION BLOCK (min -25, max +40) ===
  IF _completed >= 20 THEN
    _rate := CASE WHEN _completed > 0 THEN (_vip_count::numeric / _completed) * 100 ELSE 0 END;
    IF _rate >= 40 AND _top_partner_pct < 70 THEN _reputation_score := _reputation_score + 10;
    ELSIF _rate >= 20 AND _top_partner_pct < 70 THEN _reputation_score := _reputation_score + 5;
    END IF;

    IF _disputes_t = 0 THEN _reputation_score := _reputation_score + 10;
    ELSIF _disputes_t > 0 AND _disputes_w > 0 AND (_disputes_w::numeric / _disputes_t) > 0.9 THEN
      _reputation_score := _reputation_score + 5;
    ELSIF _disputes_t > 0 AND _disputes_l > 0 AND (_disputes_l::numeric / _disputes_t) > 0.9 THEN
      _reputation_score := _reputation_score - 10;
    END IF;

    _reputation_score := _reputation_score - LEAST(_bl_count * 5, 25);
  END IF;

  _reputation_score := GREATEST(_reputation_score, -25);
  _reputation_score := LEAST(_reputation_score, 40);

  -- === TOTAL SCORE ===
  _total_score := 60 + _profile_score + _activity_score + _risk_score + _reputation_score;
  _total_score := GREATEST(0, LEAST(100, _total_score));

  IF _completed < 20 OR _account_days < 90 THEN _status := 'insufficient_data';
  ELSIF _total_score < 40 THEN _status := 'blocked';
  ELSIF _total_score <= 50 THEN _status := 'flagged';
  ELSE _status := 'active';
  END IF;

  -- Upsert score
  INSERT INTO user_scores (
    user_id, total_score, profile_score, activity_score, risk_score, reputation_score,
    completed_visits, no_show_count, cancel_under_1h, cancel_under_3h, total_cancellations,
    disputes_total, disputes_won, disputes_lost, vip_by_count, blacklist_by_count,
    unique_partners, top_partner_pct, has_full_name, has_photo,
    status, account_age_days, last_calculated_at
  ) VALUES (
    _user_id, _total_score, _profile_score, _activity_score, _risk_score, _reputation_score,
    _completed, _no_shows, _cancel_u1h, _cancel_u3h, _total_cancel,
    _disputes_t, _disputes_w, _disputes_l, _vip_count, _bl_count,
    _unique_partners, _top_partner_pct, _has_name, _has_photo,
    _status, _account_days, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_score = EXCLUDED.total_score, profile_score = EXCLUDED.profile_score,
    activity_score = EXCLUDED.activity_score, risk_score = EXCLUDED.risk_score,
    reputation_score = EXCLUDED.reputation_score, completed_visits = EXCLUDED.completed_visits,
    no_show_count = EXCLUDED.no_show_count, cancel_under_1h = EXCLUDED.cancel_under_1h,
    cancel_under_3h = EXCLUDED.cancel_under_3h, total_cancellations = EXCLUDED.total_cancellations,
    disputes_total = EXCLUDED.disputes_total, disputes_won = EXCLUDED.disputes_won,
    disputes_lost = EXCLUDED.disputes_lost, vip_by_count = EXCLUDED.vip_by_count,
    blacklist_by_count = EXCLUDED.blacklist_by_count, unique_partners = EXCLUDED.unique_partners,
    top_partner_pct = EXCLUDED.top_partner_pct, has_full_name = EXCLUDED.has_full_name,
    has_photo = EXCLUDED.has_photo, status = EXCLUDED.status,
    account_age_days = EXCLUDED.account_age_days, last_calculated_at = now();

  _result := jsonb_build_object(
    'total_score', _total_score, 'profile_score', _profile_score,
    'activity_score', _activity_score, 'risk_score', _risk_score,
    'reputation_score', _reputation_score, 'completed_visits', _completed, 'status', _status
  );
  RETURN _result;
END;
$$;
