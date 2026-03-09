-- Drop old function first (returns jsonb)
DROP FUNCTION IF EXISTS public.calculate_user_score(uuid);

-- Recreate with void return type and new factor tracking
CREATE OR REPLACE FUNCTION public.calculate_user_score(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile RECORD;
  _stats RECORD;
  _profile_score numeric := 0;
  _activity_score numeric := 0;
  _risk_score numeric := 0;
  _reputation_score numeric := 0;
  _total_score numeric := 0;
  _status text := 'active';
  _account_age_days integer := 0;
  _has_full_name boolean := false;
  _has_photo boolean := false;
  _has_bio boolean := false;
  _kyc_verified boolean := false;
  _email_verified boolean := false;
  _phone_verified boolean := false;
  _has_telegram boolean := false;
  _referral_count integer := 0;
  _vip_count integer := 0;
  _bl_count integer := 0;
  _disputes_total integer := 0;
  _disputes_won integer := 0;
  _disputes_lost integer := 0;
  _top_pct numeric := 0;
BEGIN
  -- Get profile data
  SELECT 
    p.*,
    mp.social_links
  INTO _profile
  FROM profiles p
  LEFT JOIN master_profiles mp ON mp.user_id = p.id
  WHERE p.id = _user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  _account_age_days := EXTRACT(EPOCH FROM (now() - _profile.created_at)) / 86400;

  -- Profile factors
  _has_full_name := (_profile.first_name IS NOT NULL AND _profile.first_name != '' 
                     AND _profile.last_name IS NOT NULL AND _profile.last_name != '');
  _has_photo := (_profile.avatar_url IS NOT NULL AND _profile.avatar_url != '');
  _has_bio := (_profile.bio IS NOT NULL AND _profile.bio != '');
  _kyc_verified := COALESCE(_profile.kyc_verified, false);
  _phone_verified := (_profile.phone IS NOT NULL AND _profile.phone != '');

  -- Telegram from social_links
  IF _profile.social_links IS NOT NULL THEN
    _has_telegram := (_profile.social_links->>'telegram' IS NOT NULL AND _profile.social_links->>'telegram' != '');
  END IF;

  -- Referrals
  SELECT COUNT(*) INTO _referral_count
  FROM profiles WHERE referred_by = _profile.skillspot_id;

  -- Email verification from auth.users
  SELECT (email_confirmed_at IS NOT NULL) INTO _email_verified
  FROM auth.users WHERE id = _user_id;

  -- Booking stats
  SELECT 
    COALESCE(COUNT(*) FILTER (WHERE status = 'completed'), 0),
    COALESCE(COUNT(*) FILTER (WHERE status = 'no_show'), 0),
    COALESCE(COUNT(*) FILTER (WHERE status = 'cancelled' AND cancelled_by = _user_id 
      AND scheduled_at - created_at < INTERVAL '1 hour'), 0),
    COALESCE(COUNT(*) FILTER (WHERE status = 'cancelled' AND cancelled_by = _user_id 
      AND scheduled_at - created_at >= INTERVAL '1 hour'
      AND scheduled_at - created_at < INTERVAL '3 hours'), 0),
    COALESCE(COUNT(*) FILTER (WHERE status = 'cancelled' AND cancelled_by = _user_id), 0),
    COALESCE(COUNT(DISTINCT executor_id), 0)
  INTO _stats
  FROM bookings
  WHERE client_id = _user_id;

  -- VIP count
  SELECT COUNT(*) INTO _vip_count FROM client_tags WHERE client_id = _user_id AND tag = 'vip';
  
  -- Blacklist count
  SELECT COUNT(*) INTO _bl_count FROM blacklists WHERE blocked_id = _user_id;

  -- Disputes
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'resolved' AND resolution = 'initiator_wins'),
    COUNT(*) FILTER (WHERE status = 'resolved' AND resolution = 'respondent_wins')
  INTO _disputes_total, _disputes_won, _disputes_lost
  FROM disputes
  WHERE initiator_id = _user_id OR respondent_id = _user_id;

  -- Top partner concentration
  IF _stats.completed > 0 THEN
    SELECT COALESCE(MAX(cnt)::numeric / _stats.completed * 100, 0) INTO _top_pct
    FROM (SELECT executor_id, COUNT(*) as cnt FROM bookings WHERE client_id = _user_id AND status = 'completed' GROUP BY executor_id) sub;
  END IF;

  -- === SCORING ===
  -- Profile Score (max 20)
  IF _has_full_name THEN _profile_score := _profile_score + 5; END IF;
  IF _has_photo THEN _profile_score := _profile_score + 5; END IF;
  IF _email_verified THEN _profile_score := _profile_score + 3; END IF;
  IF _phone_verified THEN _profile_score := _profile_score + 3; END IF;
  IF _has_telegram THEN _profile_score := _profile_score + 2; END IF;
  IF _kyc_verified THEN _profile_score := _profile_score + 2; END IF;

  -- Activity Score (max 15)
  _activity_score := LEAST(15, _stats.completed * 0.5);

  -- Risk Score (penalty, max -25)
  _risk_score := 0 - (_stats.no_shows * 5) - (_stats.cancel_1h * 3) - (_stats.cancel_3h * 1);
  _risk_score := GREATEST(-25, _risk_score);

  -- Reputation Score (max 40)
  _reputation_score := (_vip_count * 3) - (_bl_count * 5) - (_disputes_lost * 3) + (_disputes_won * 2);
  IF _referral_count > 0 THEN _reputation_score := _reputation_score + LEAST(5, _referral_count); END IF;
  _reputation_score := GREATEST(-20, LEAST(40, _reputation_score));

  -- Total (base 25)
  _total_score := 25 + _profile_score + _activity_score + _risk_score + _reputation_score;
  _total_score := GREATEST(0, LEAST(100, _total_score));

  -- Status
  IF _stats.completed < 20 AND _account_age_days < 90 THEN
    _status := 'insufficient_data';
  ELSIF _total_score < 40 THEN
    _status := 'blocked';
  ELSIF _total_score < 50 THEN
    _status := 'restricted';
  ELSE
    _status := 'active';
  END IF;

  -- Upsert
  INSERT INTO user_scores (
    user_id, total_score, profile_score, activity_score, risk_score, reputation_score,
    completed_visits, no_show_count, cancel_under_1h, cancel_under_3h, total_cancellations,
    disputes_total, disputes_won, disputes_lost, vip_by_count, blacklist_by_count,
    unique_partners, top_partner_pct, has_full_name, has_photo, has_bio,
    kyc_verified, email_verified, phone_verified, has_telegram, referral_count,
    status, account_age_days, last_calculated_at
  ) VALUES (
    _user_id, _total_score, _profile_score, _activity_score, _risk_score, _reputation_score,
    _stats.completed, _stats.no_shows, _stats.cancel_1h, _stats.cancel_3h, _stats.total_cancel,
    _disputes_total, _disputes_won, _disputes_lost, _vip_count, _bl_count,
    _stats.unique_partners, _top_pct, _has_full_name, _has_photo, _has_bio,
    _kyc_verified, _email_verified, _phone_verified, _has_telegram, _referral_count,
    _status, _account_age_days, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_score = EXCLUDED.total_score,
    profile_score = EXCLUDED.profile_score,
    activity_score = EXCLUDED.activity_score,
    risk_score = EXCLUDED.risk_score,
    reputation_score = EXCLUDED.reputation_score,
    completed_visits = EXCLUDED.completed_visits,
    no_show_count = EXCLUDED.no_show_count,
    cancel_under_1h = EXCLUDED.cancel_under_1h,
    cancel_under_3h = EXCLUDED.cancel_under_3h,
    total_cancellations = EXCLUDED.total_cancellations,
    disputes_total = EXCLUDED.disputes_total,
    disputes_won = EXCLUDED.disputes_won,
    disputes_lost = EXCLUDED.disputes_lost,
    vip_by_count = EXCLUDED.vip_by_count,
    blacklist_by_count = EXCLUDED.blacklist_by_count,
    unique_partners = EXCLUDED.unique_partners,
    top_partner_pct = EXCLUDED.top_partner_pct,
    has_full_name = EXCLUDED.has_full_name,
    has_photo = EXCLUDED.has_photo,
    has_bio = EXCLUDED.has_bio,
    kyc_verified = EXCLUDED.kyc_verified,
    email_verified = EXCLUDED.email_verified,
    phone_verified = EXCLUDED.phone_verified,
    has_telegram = EXCLUDED.has_telegram,
    referral_count = EXCLUDED.referral_count,
    status = EXCLUDED.status,
    account_age_days = EXCLUDED.account_age_days,
    last_calculated_at = now(),
    updated_at = now();
END;
$$;