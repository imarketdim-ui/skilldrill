
-- 1. Chat Groups
CREATE TABLE IF NOT EXISTS public.chat_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members view groups" ON public.chat_groups FOR SELECT
  USING (EXISTS (SELECT 1 FROM chat_group_members WHERE group_id = id AND user_id = auth.uid()) OR created_by = auth.uid());
CREATE POLICY "Users create groups" ON public.chat_groups FOR INSERT
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Creators update groups" ON public.chat_groups FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Members view group memberships" ON public.chat_group_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM chat_group_members cgm WHERE cgm.group_id = chat_group_members.group_id AND cgm.user_id = auth.uid()));
CREATE POLICY "Creators and self manage members" ON public.chat_group_members FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM chat_groups WHERE id = group_id AND created_by = auth.uid()) OR user_id = auth.uid());
CREATE POLICY "Creators delete members" ON public.chat_group_members FOR DELETE
  USING (EXISTS (SELECT 1 FROM chat_groups WHERE id = group_id AND created_by = auth.uid()) OR user_id = auth.uid());

-- 2. Master Achievements
CREATE TABLE IF NOT EXISTS public.master_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_type text NOT NULL,
  title text NOT NULL,
  description text,
  earned_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE(user_id, achievement_type)
);

ALTER TABLE public.master_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own achievements" ON public.master_achievements FOR SELECT
  USING (user_id = auth.uid() OR is_platform_admin(auth.uid()));
CREATE POLICY "System manages achievements" ON public.master_achievements FOR ALL
  USING (is_platform_admin(auth.uid()) OR user_id = auth.uid())
  WITH CHECK (is_platform_admin(auth.uid()) OR user_id = auth.uid());

-- 3. Aggregated Business Rating Function
CREATE OR REPLACE FUNCTION public.calculate_business_rating(_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _avg_master_rating numeric := 0;
  _avg_review_rating numeric := 0;
  _master_count integer := 0;
  _review_count integer := 0;
  _total_rating numeric := 0;
BEGIN
  SELECT COALESCE(AVG(r.avg_score), 0), COUNT(DISTINCT bm.master_id)
  INTO _avg_master_rating, _master_count
  FROM business_masters bm
  LEFT JOIN (
    SELECT rated_id, AVG(score) as avg_score FROM ratings GROUP BY rated_id
  ) r ON r.rated_id = bm.master_id
  WHERE bm.business_id = _business_id AND bm.status = 'accepted';

  SELECT COALESCE(AVG(rt.score), 0), COUNT(*)
  INTO _avg_review_rating, _review_count
  FROM ratings rt
  JOIN bookings b ON b.executor_id = rt.rated_id
  WHERE b.organization_id = _business_id AND b.status = 'completed';

  IF _master_count > 0 AND _review_count > 0 THEN
    _total_rating := (_avg_master_rating * 0.6) + (_avg_review_rating * 0.4);
  ELSIF _master_count > 0 THEN
    _total_rating := _avg_master_rating;
  ELSIF _review_count > 0 THEN
    _total_rating := _avg_review_rating;
  END IF;

  RETURN jsonb_build_object(
    'business_id', _business_id,
    'total_rating', ROUND(_total_rating, 2),
    'master_avg', ROUND(_avg_master_rating, 2),
    'review_avg', ROUND(_avg_review_rating, 2),
    'master_count', _master_count,
    'review_count', _review_count
  );
END;
$$;

-- 4. Prevent sole owner deletion
CREATE OR REPLACE FUNCTION public.prevent_sole_owner_deletion()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM business_locations WHERE owner_id = OLD.id AND is_active = true) THEN
    RAISE EXCEPTION 'Cannot delete user who is the sole owner of a business';
  END IF;
  IF EXISTS (SELECT 1 FROM networks WHERE owner_id = OLD.id AND is_active = true) THEN
    RAISE EXCEPTION 'Cannot delete user who is the sole owner of a network';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS prevent_owner_profile_deletion ON profiles;
CREATE TRIGGER prevent_owner_profile_deletion
  BEFORE DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_sole_owner_deletion();

-- 5. Booking time-slot overlap prevention trigger
CREATE OR REPLACE FUNCTION public.check_booking_overlap()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IN ('cancelled', 'rejected') THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE executor_id = NEW.executor_id
    AND id != NEW.id
    AND status NOT IN ('cancelled', 'rejected')
    AND tstzrange(scheduled_at, scheduled_at + make_interval(mins => duration_minutes))
     && tstzrange(NEW.scheduled_at, NEW.scheduled_at + make_interval(mins => NEW.duration_minutes))
  ) THEN
    RAISE EXCEPTION 'Booking time slot overlaps with existing booking';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_booking_no_overlap ON bookings;
CREATE TRIGGER check_booking_no_overlap
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION check_booking_overlap();
