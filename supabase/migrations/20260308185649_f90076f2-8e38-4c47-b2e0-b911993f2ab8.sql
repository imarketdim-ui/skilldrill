
-- ============================================
-- Stage 2: Shadow Scores + Search Synonyms
-- ============================================

-- 2.1 Shadow Scores table
CREATE TABLE IF NOT EXISTS public.shadow_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  score numeric NOT NULL DEFAULT 50,
  factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'normal',
  calculated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shadow_scores ENABLE ROW LEVEL SECURITY;

-- Only platform admins can read shadow scores (never visible to users)
CREATE POLICY "Platform admins can read shadow_scores"
  ON public.shadow_scores FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- 2.2 Search synonyms table
CREATE TABLE IF NOT EXISTS public.search_synonyms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term text NOT NULL,
  synonyms text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_search_synonyms_term ON public.search_synonyms(lower(term));

ALTER TABLE public.search_synonyms ENABLE ROW LEVEL SECURITY;

-- Everyone can read synonyms for search
CREATE POLICY "Anyone can read search_synonyms"
  ON public.search_synonyms FOR SELECT TO authenticated
  USING (true);

-- Allow anonymous reads too (for catalog search)
CREATE POLICY "Anon can read search_synonyms"
  ON public.search_synonyms FOR SELECT TO anon
  USING (true);

-- Admins manage synonyms
CREATE POLICY "Admins manage search_synonyms"
  ON public.search_synonyms FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- 2.3 Shadow score calculation function
CREATE OR REPLACE FUNCTION public.calculate_shadow_score(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _score numeric := 50;
  _no_shows integer := 0;
  _cancellations integer := 0;
  _completed integer := 0;
  _disputes_lost integer := 0;
  _disputes_total integer := 0;
  _fraud_count integer := 0;
  _bl_count integer := 0;
  _account_days integer := 0;
  _factors jsonb;
  _status text := 'normal';
BEGIN
  -- Account age
  SELECT COALESCE(EXTRACT(DAY FROM now() - created_at)::integer, 0)
  INTO _account_days FROM profiles WHERE id = _user_id;

  -- Booking stats
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE status = 'completed'), 0),
    COALESCE(COUNT(*) FILTER (WHERE status = 'no_show'), 0),
    COALESCE(COUNT(*) FILTER (WHERE status = 'cancelled'), 0)
  INTO _completed, _no_shows, _cancellations
  FROM bookings WHERE client_id = _user_id;

  -- Disputes lost
  SELECT COALESCE(COUNT(*), 0) INTO _disputes_lost
  FROM disputes WHERE respondent_id = _user_id AND status = 'resolved_for_initiator';

  SELECT COALESCE(COUNT(*), 0) INTO _disputes_total
  FROM disputes WHERE (initiator_id = _user_id OR respondent_id = _user_id);

  -- Unresolved fraud flags
  SELECT COALESCE(COUNT(*), 0) INTO _fraud_count
  FROM fraud_flags WHERE user_id = _user_id AND is_resolved = false;

  -- Blacklist count
  SELECT COALESCE(COUNT(*), 0) INTO _bl_count
  FROM blacklists WHERE blocked_id = _user_id;

  -- Calculate score
  -- Positive factors
  IF _completed >= 50 THEN _score := _score + 15;
  ELSIF _completed >= 20 THEN _score := _score + 10;
  ELSIF _completed >= 5 THEN _score := _score + 5;
  END IF;

  IF _account_days >= 365 THEN _score := _score + 10;
  ELSIF _account_days >= 180 THEN _score := _score + 5;
  END IF;

  -- Negative factors
  IF _completed > 0 THEN
    -- No-show penalty
    _score := _score - LEAST((_no_shows::numeric / GREATEST(_completed, 1)) * 100, 30);
    -- Late cancellation penalty
    _score := _score - LEAST((_cancellations::numeric / GREATEST(_completed, 1)) * 50, 20);
  END IF;

  -- Disputes penalty
  _score := _score - (_disputes_lost * 8);

  -- Fraud flags penalty
  _score := _score - (_fraud_count * 10);

  -- Blacklist penalty
  _score := _score - LEAST(_bl_count * 5, 20);

  -- Clamp
  _score := GREATEST(0, LEAST(100, _score));

  -- Status
  IF _score < 20 THEN _status := 'blocked';
  ELSIF _score < 40 THEN _status := 'high_risk';
  ELSIF _score < 60 THEN _status := 'moderate_risk';
  ELSE _status := 'normal';
  END IF;

  _factors := jsonb_build_object(
    'completed', _completed,
    'no_shows', _no_shows,
    'cancellations', _cancellations,
    'disputes_lost', _disputes_lost,
    'disputes_total', _disputes_total,
    'fraud_flags', _fraud_count,
    'blacklist_count', _bl_count,
    'account_days', _account_days
  );

  INSERT INTO shadow_scores (user_id, score, factors, status, calculated_at)
  VALUES (_user_id, _score, _factors, _status, now())
  ON CONFLICT (user_id) DO UPDATE SET
    score = EXCLUDED.score,
    factors = EXCLUDED.factors,
    status = EXCLUDED.status,
    calculated_at = now();

  RETURN jsonb_build_object('score', _score, 'status', _status, 'factors', _factors);
END;
$$;
