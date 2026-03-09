-- Drop and recreate calculate_user_score with proper explicit variables
DROP FUNCTION IF EXISTS calculate_user_score(uuid);

CREATE FUNCTION calculate_user_score(_user_id uuid)
RETURNS TABLE (
  score numeric,
  status text,
  profile_score numeric,
  activity_score numeric,
  risk_score numeric,
  reputation_score numeric,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile RECORD;
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
  _completed_count integer := 0;
  _no_show_count integer := 0;
  _cancel_1h_count integer := 0;
  _cancel_3h_count integer := 0;
  _cancel_total integer := 0;
  _unique_executors integer := 0;
BEGIN
  SELECT p.*, mp.social_links
  INTO _profile
  FROM profiles p
  LEFT JOIN master_profiles mp ON mp.user_id = p.id
  WHERE p.id = _user_id;

  IF NOT FOUND THEN RETURN; END IF;

  _account_age_days := EXTRACT(EPOCH FROM (now() - _profile.created_at)) / 86400;
  _has_full_name := (_profile.first_name IS NOT NULL AND _profile.first_name != '' 
                     AND _profile.last_name IS NOT NULL AND _profile.last_name != '');
  _has_photo := (_profile.avatar_url IS NOT NULL AND _profile.avatar_url != '');
  _has_bio := (_profile.bio IS NOT NULL AND _profile.bio != '');
  _kyc_verified := COALESCE(_profile.kyc_verified, false);
  _phone_verified := (_profile.phone IS NOT NULL AND _profile.phone != '');

  IF _profile.social_links IS NOT NULL THEN
    _has_telegram := (_profile.social_links->>'telegram' IS NOT NULL AND _profile.social_links->>'telegram' != '');
  END IF;

  SELECT COUNT(*) INTO _referral_count FROM profiles WHERE referred_by = _profile.skillspot_id;
  SELECT (email_confirmed_at IS NOT NULL) INTO _email_verified FROM auth.users WHERE id = _user_id;

  SELECT 
    COALESCE(COUNT(*) FILTER (WHERE b.status = 'completed'), 0),
    COALESCE(COUNT(*) FILTER (WHERE b.status = 'no_show'), 0),
    COALESCE(COUNT(*) FILTER (WHERE b.status = 'cancelled' AND b.cancelled_by = _user_id 
      AND b.scheduled_at - b.created_at < INTERVAL '1 hour'), 0),
    COALESCE(COUNT(*) FILTER (WHERE b.status = 'cancelled' AND b.cancelled_by = _user_id 
      AND b.scheduled_at - b.created_at >= INTERVAL '1 hour'
      AND b.scheduled_at - b.created_at < INTERVAL '3 hours'), 0),
    COALESCE(COUNT(*) FILTER (WHERE b.status = 'cancelled' AND b.cancelled_by = _user_id), 0),
    COALESCE(COUNT(DISTINCT b.executor_id), 0)
  INTO _completed_count, _no_show_count, _cancel_1h_count, _cancel_3h_count, _cancel_total, _unique_executors
  FROM bookings b
  WHERE b.client_id = _user_id;

  SELECT COUNT(*) INTO _vip_count FROM client_tags WHERE client_id = _user_id AND tag = 'vip';
  SELECT COUNT(*) INTO _bl_count FROM blacklists WHERE blocked_id = _user_id;

  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE d.status = 'resolved' AND d.resolution = 'initiator_wins'),
    COUNT(*) FILTER (WHERE d.status = 'resolved' AND d.resolution = 'respondent_wins')
  INTO _disputes_total, _disputes_won, _disputes_lost
  FROM disputes d
  WHERE d.initiator_id = _user_id OR d.respondent_id = _user_id;

  IF _completed_count > 0 THEN
    SELECT COALESCE(MAX(cnt)::numeric / _completed_count * 100, 0) INTO _top_pct
    FROM (SELECT executor_id, COUNT(*) as cnt FROM bookings WHERE client_id = _user_id AND status = 'completed' GROUP BY executor_id) sub;
  END IF;

  -- Profile Score (max 20)
  IF _has_full_name THEN _profile_score := _profile_score + 5; END IF;
  IF _has_photo THEN _profile_score := _profile_score + 5; END IF;
  IF _email_verified THEN _profile_score := _profile_score + 3; END IF;
  IF _phone_verified THEN _profile_score := _profile_score + 3; END IF;
  IF _has_telegram THEN _profile_score := _profile_score + 2; END IF;
  IF _kyc_verified THEN _profile_score := _profile_score + 2; END IF;

  _activity_score := LEAST(15, _completed_count * 0.5);
  _risk_score := GREATEST(-25, 0 - (_no_show_count * 5) - (_cancel_1h_count * 3) - (_cancel_3h_count * 1));

  _reputation_score := (_vip_count * 3) - (_bl_count * 5) - (_disputes_lost * 3) + (_disputes_won * 2);
  _reputation_score := _reputation_score + LEAST(10, _referral_count * 2);
  IF _top_pct > 70 THEN _reputation_score := _reputation_score - 5; END IF;
  _reputation_score := GREATEST(-20, LEAST(40, _reputation_score));

  _total_score := GREATEST(0, LEAST(100, _profile_score + _activity_score + _risk_score + _reputation_score));

  IF _completed_count < 20 AND _account_age_days < 90 THEN _status := 'insufficient_data';
  ELSIF _total_score < 40 THEN _status := 'blocked';
  ELSIF _total_score < 50 THEN _status := 'prepayment_required';
  ELSE _status := 'active';
  END IF;

  RETURN QUERY SELECT
    _total_score, _status, _profile_score, _activity_score, _risk_score, _reputation_score,
    jsonb_build_object(
      'account_age_days', _account_age_days, 'completed_visits', _completed_count,
      'no_shows', _no_show_count, 'cancellations_1h', _cancel_1h_count,
      'cancellations_3h', _cancel_3h_count, 'cancellations_total', _cancel_total,
      'unique_executors', _unique_executors, 'vip_count', _vip_count,
      'blacklist_count', _bl_count, 'disputes_total', _disputes_total,
      'disputes_won', _disputes_won, 'disputes_lost', _disputes_lost,
      'top_partner_concentration', _top_pct, 'referral_count', _referral_count,
      'has_full_name', _has_full_name, 'has_photo', _has_photo,
      'email_verified', _email_verified, 'phone_verified', _phone_verified,
      'has_telegram', _has_telegram, 'kyc_verified', _kyc_verified
    );
END;
$$;