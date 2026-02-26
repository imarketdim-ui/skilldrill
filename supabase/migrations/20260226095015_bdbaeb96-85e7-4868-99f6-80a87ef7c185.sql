
-- Fix: stats become active when visits >= 20 OR account_age >= 90 days
-- Previously used OR (both required), now AND (either sufficient)
CREATE OR REPLACE FUNCTION public.calculate_user_score(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  _is_kyc boolean := false;
  _account_days integer := 0;
  _status text;
  _rate numeric;
  _result jsonb;
  _vip_recent integer := 0;
  _vip_total integer := 0;
  _cluster_pct numeric := 0;
  _cluster_size integer := 0;
  _concentration_flagged boolean := false;
BEGIN
  SELECT
    COALESCE((COALESCE(p.first_name, '') != '' AND COALESCE(p.last_name, '') != ''), false),
    COALESCE((p.avatar_url IS NOT NULL AND p.avatar_url != ''), false),
    COALESCE(GREATEST(0, EXTRACT(DAY FROM now() - p.created_at))::integer, 0),
    COALESCE(p.kyc_verified, false)
  INTO _has_name, _has_photo, _account_days, _is_kyc
  FROM profiles p WHERE p.id = _user_id;

  IF _has_name AND _has_photo THEN _profile_score := _profile_score + 5; END IF;
  IF _is_kyc THEN _profile_score := _profile_score + 15; END IF;
  _profile_score := LEAST(_profile_score, 20);

  SELECT COALESCE(COUNT(*), 0) INTO _completed
  FROM bookings b
  JOIN profiles p_client ON p_client.id = b.client_id
  JOIN profiles p_exec ON p_exec.id = b.executor_id
  WHERE b.client_id = _user_id AND b.status = 'completed'
    AND p_client.kyc_verified = true AND p_exec.kyc_verified = true;

  IF _completed = 0 THEN
    SELECT COALESCE(COUNT(*), 0) INTO _completed
    FROM bookings WHERE client_id = _user_id AND status = 'completed';
  END IF;

  IF _completed >= 100 THEN _activity_score := 10;
  ELSIF _completed >= 50 THEN _activity_score := 5;
  END IF;
  IF _account_days >= 90 THEN _activity_score := _activity_score + 5; END IF;
  _activity_score := LEAST(_activity_score, 15);

  SELECT COALESCE(COUNT(*), 0) INTO _vip_count
  FROM ratings r JOIN profiles p_rater ON p_rater.id = r.rater_id
  WHERE r.rated_id = _user_id AND r.score >= 4 AND p_rater.kyc_verified = true;
  IF _vip_count = 0 THEN
    SELECT COALESCE(COUNT(*), 0) INTO _vip_count FROM ratings WHERE rated_id = _user_id AND score >= 4;
  END IF;

  SELECT COALESCE(COUNT(*), 0) INTO _bl_count
  FROM blacklists bl WHERE bl.blocked_id = _user_id
    AND EXISTS (
      SELECT 1 FROM bookings b WHERE b.client_id = _user_id AND b.executor_id = bl.blocker_id AND b.status = 'completed'
      UNION ALL SELECT 1 FROM bookings b WHERE b.executor_id = _user_id AND b.client_id = bl.blocker_id AND b.status = 'completed'
    )
    AND NOT EXISTS (SELECT 1 FROM user_scores us WHERE us.user_id = bl.blocker_id AND us.total_score < 50);
  IF _bl_count = 0 THEN
    SELECT COALESCE(COUNT(*), 0) INTO _bl_count FROM blacklists WHERE blocked_id = _user_id;
  END IF;

  SELECT COALESCE(COUNT(DISTINCT executor_id), 0),
         CASE WHEN COUNT(DISTINCT executor_id) > 0
              THEN COALESCE((MAX(partner_count)::numeric / NULLIF(COUNT(*), 0)::numeric) * 100, 0) ELSE 0 END
  INTO _unique_partners, _top_partner_pct
  FROM (SELECT executor_id, COUNT(*) as partner_count FROM bookings WHERE client_id = _user_id AND status = 'completed' GROUP BY executor_id) sub;

  IF _top_partner_pct >= 70 AND _completed >= 20 THEN
    _concentration_flagged := true;
    INSERT INTO fraud_flags (user_id, flag_type, description, severity, metadata)
    SELECT _user_id, 'concentration', 'Более 70% визитов с одним контрагентом', 'info', jsonb_build_object('top_partner_pct', _top_partner_pct)
    WHERE NOT EXISTS (SELECT 1 FROM fraud_flags WHERE user_id = _user_id AND flag_type = 'concentration' AND is_resolved = false);
  END IF;

  SELECT COALESCE(COUNT(*), 0) INTO _vip_recent FROM ratings WHERE rated_id = _user_id AND score >= 4 AND created_at >= now() - interval '7 days';
  _vip_total := _vip_count;
  IF _vip_total >= 5 AND _vip_recent > 0 AND (_vip_recent::numeric / _vip_total) > 0.3 THEN
    INSERT INTO fraud_flags (user_id, flag_type, description, severity, metadata)
    SELECT _user_id, 'vip_spike', 'Резкий рост VIP за 7 дней', 'warning', jsonb_build_object('recent', _vip_recent, 'total', _vip_total)
    WHERE NOT EXISTS (SELECT 1 FROM fraud_flags WHERE user_id = _user_id AND flag_type = 'vip_spike' AND is_resolved = false AND created_at >= now() - interval '7 days');
  END IF;

  SELECT COUNT(DISTINCT partner_id), CASE WHEN COUNT(*) > 0 THEN (MAX(partner_visits)::numeric / COUNT(*)::numeric) * 100 ELSE 0 END
  INTO _cluster_size, _cluster_pct
  FROM (SELECT executor_id as partner_id, COUNT(*) as partner_visits FROM bookings WHERE client_id = _user_id AND status = 'completed' GROUP BY executor_id ORDER BY partner_visits DESC LIMIT 5) top_partners;

  IF _cluster_size > 0 AND _cluster_size < 5 AND _cluster_pct > 70 AND _completed >= 20 THEN
    INSERT INTO fraud_flags (user_id, flag_type, description, severity, metadata)
    SELECT _user_id, 'cluster', 'Замкнутая сеть контрагентов', 'warning', jsonb_build_object('cluster_size', _cluster_size, 'cluster_pct', _cluster_pct)
    WHERE NOT EXISTS (SELECT 1 FROM fraud_flags WHERE user_id = _user_id AND flag_type = 'cluster' AND is_resolved = false);
  END IF;

  -- Risk block only calculated when sufficient data (>=20 visits OR >=90 days)
  IF _completed >= 20 OR _account_days >= 90 THEN
    SELECT COALESCE(COUNT(*), 0) INTO _no_shows FROM bookings WHERE client_id = _user_id AND scheduled_at < now() AND status = 'pending';
    SELECT COALESCE(COUNT(*), 0) INTO _total_cancel FROM bookings WHERE client_id = _user_id AND status = 'cancelled';
    SELECT
      COALESCE(COUNT(*) FILTER (WHERE scheduled_at - updated_at < interval '1 hour' AND scheduled_at - updated_at > interval '0'), 0),
      COALESCE(COUNT(*) FILTER (WHERE scheduled_at - updated_at < interval '3 hours' AND scheduled_at - updated_at >= interval '1 hour'), 0)
    INTO _cancel_u1h, _cancel_u3h FROM bookings WHERE client_id = _user_id AND status = 'cancelled';

    _rate := CASE WHEN _completed > 0 THEN (_no_shows::numeric / _completed) * 100 ELSE 0 END;
    IF _rate > 20 THEN _risk_score := -30; ELSIF _rate > 10 THEN _risk_score := -15; ELSIF _rate > 5 THEN _risk_score := -7; ELSIF _rate > 2 THEN _risk_score := -3; END IF;

    _rate := CASE WHEN _completed > 0 THEN (_cancel_u1h::numeric / _completed) * 100 ELSE 0 END;
    IF _rate > 15 THEN _risk_score := _risk_score - 15; ELSIF _rate > 7 THEN _risk_score := _risk_score - 8; ELSIF _rate > 3 THEN _risk_score := _risk_score - 3; END IF;

    SELECT COALESCE(COUNT(*), 0), COALESCE(COUNT(*) FILTER (WHERE status = 'resolved_for_initiator'), 0), COALESCE(COUNT(*) FILTER (WHERE status = 'resolved_for_respondent'), 0)
    INTO _disputes_t, _disputes_w, _disputes_l FROM disputes WHERE (initiator_id = _user_id OR respondent_id = _user_id) AND status IN ('resolved_for_initiator', 'resolved_for_respondent', 'resolved');

    _rate := CASE WHEN _completed > 0 THEN (_disputes_l::numeric / _completed) * 100 ELSE 0 END;
    IF _rate > 20 THEN _risk_score := _risk_score - 30; ELSIF _rate > 10 THEN _risk_score := _risk_score - 15; ELSIF _rate > 0 THEN _risk_score := _risk_score - 5; END IF;

    _risk_score := _risk_score - LEAST(_bl_count * 5, 25);
  END IF;
  _risk_score := GREATEST(_risk_score, -80);

  IF _completed >= 20 OR _account_days >= 90 THEN
    IF NOT _concentration_flagged THEN
      _rate := CASE WHEN _completed > 0 THEN (_vip_count::numeric / _completed) * 100 ELSE 0 END;
      IF _rate >= 40 THEN _reputation_score := 10; ELSIF _rate >= 20 THEN _reputation_score := 5; END IF;
    END IF;
    IF _disputes_t = 0 THEN _reputation_score := _reputation_score + 10;
    ELSIF _disputes_t > 0 AND _disputes_w > 0 AND (_disputes_w::numeric / _disputes_t) > 0.9 THEN _reputation_score := _reputation_score + 5;
    ELSIF _disputes_t > 0 AND _disputes_l > 0 AND (_disputes_l::numeric / _disputes_t) > 0.9 THEN _reputation_score := _reputation_score - 10;
    END IF;
    _reputation_score := _reputation_score - LEAST(_bl_count * 5, 25);
  END IF;
  _reputation_score := GREATEST(_reputation_score, -25);
  _reputation_score := LEAST(_reputation_score, 40);

  _total_score := 60 + _profile_score + _activity_score + _risk_score + _reputation_score;
  _total_score := GREATEST(0, LEAST(100, _total_score));

  -- FIXED: Use AND instead of OR — stats active if visits >= 20 OR age >= 90
  IF _completed < 20 AND _account_days < 90 THEN _status := 'insufficient_data';
  ELSIF _total_score < 40 THEN
    _status := 'blocked';
    INSERT INTO fraud_flags (user_id, flag_type, description, severity, metadata)
    SELECT _user_id, 'auto_blocked', 'Автоблокировка: рейтинг ' || ROUND(_total_score), 'critical', jsonb_build_object('score', _total_score)
    WHERE NOT EXISTS (SELECT 1 FROM fraud_flags WHERE user_id = _user_id AND flag_type = 'auto_blocked' AND is_resolved = false);
  ELSIF _total_score <= 50 THEN
    _status := 'restricted';
    INSERT INTO fraud_flags (user_id, flag_type, description, severity, metadata)
    SELECT _user_id, 'low_score_moderation', 'Низкий рейтинг: ' || ROUND(_total_score), 'warning', jsonb_build_object('score', _total_score)
    WHERE NOT EXISTS (SELECT 1 FROM fraud_flags WHERE user_id = _user_id AND flag_type = 'low_score_moderation' AND is_resolved = false);
  ELSE _status := 'active';
  END IF;

  INSERT INTO user_scores (user_id, total_score, profile_score, activity_score, risk_score, reputation_score, completed_visits, no_show_count, cancel_under_1h, cancel_under_3h, total_cancellations, disputes_total, disputes_won, disputes_lost, vip_by_count, blacklist_by_count, unique_partners, top_partner_pct, has_full_name, has_photo, kyc_verified, status, account_age_days, last_calculated_at)
  VALUES (_user_id, _total_score, _profile_score, _activity_score, _risk_score, _reputation_score, _completed, _no_shows, _cancel_u1h, _cancel_u3h, _total_cancel, _disputes_t, _disputes_w, _disputes_l, _vip_count, _bl_count, _unique_partners, _top_partner_pct, _has_name, _has_photo, _is_kyc, _status, _account_days, now())
  ON CONFLICT (user_id) DO UPDATE SET
    total_score = EXCLUDED.total_score, profile_score = EXCLUDED.profile_score, activity_score = EXCLUDED.activity_score, risk_score = EXCLUDED.risk_score,
    reputation_score = EXCLUDED.reputation_score, completed_visits = EXCLUDED.completed_visits, no_show_count = EXCLUDED.no_show_count, cancel_under_1h = EXCLUDED.cancel_under_1h,
    cancel_under_3h = EXCLUDED.cancel_under_3h, total_cancellations = EXCLUDED.total_cancellations, disputes_total = EXCLUDED.disputes_total, disputes_won = EXCLUDED.disputes_won,
    disputes_lost = EXCLUDED.disputes_lost, vip_by_count = EXCLUDED.vip_by_count, blacklist_by_count = EXCLUDED.blacklist_by_count, unique_partners = EXCLUDED.unique_partners,
    top_partner_pct = EXCLUDED.top_partner_pct, has_full_name = EXCLUDED.has_full_name, has_photo = EXCLUDED.has_photo, kyc_verified = EXCLUDED.kyc_verified,
    status = EXCLUDED.status, account_age_days = EXCLUDED.account_age_days, last_calculated_at = now();

  RETURN jsonb_build_object('total_score', _total_score, 'profile_score', _profile_score, 'activity_score', _activity_score, 'risk_score', _risk_score, 'reputation_score', _reputation_score, 'completed_visits', _completed, 'status', _status, 'kyc_verified', _is_kyc);
END;
$function$;
