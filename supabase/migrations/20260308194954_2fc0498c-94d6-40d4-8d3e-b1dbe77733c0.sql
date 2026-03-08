
-- 1. Make bookings.organization_id nullable for solo-master direct bookings
ALTER TABLE public.bookings ALTER COLUMN organization_id DROP NOT NULL;

-- 2. Server-side blacklist check trigger on bookings
CREATE OR REPLACE FUNCTION public.check_booking_blacklist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM blacklists
    WHERE blocker_id = NEW.executor_id AND blocked_id = NEW.client_id
  ) THEN
    RAISE EXCEPTION 'Client is blacklisted by this master';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_booking_blacklist ON public.bookings;
CREATE TRIGGER trg_check_booking_blacklist
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_booking_blacklist();

-- 3. Server-side blacklist check trigger on lesson_bookings
CREATE OR REPLACE FUNCTION public.check_lesson_booking_blacklist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher_id uuid;
BEGIN
  SELECT teacher_id INTO v_teacher_id FROM lessons WHERE id = NEW.lesson_id;
  IF EXISTS (
    SELECT 1 FROM blacklists
    WHERE blocker_id = v_teacher_id AND blocked_id = NEW.student_id
  ) THEN
    RAISE EXCEPTION 'Student is blacklisted by this teacher';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_lesson_booking_blacklist ON public.lesson_bookings;
CREATE TRIGGER trg_check_lesson_booking_blacklist
  BEFORE INSERT ON public.lesson_bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_lesson_booking_blacklist();

-- 4. Server-side booking overlap check (bookings table)
CREATE OR REPLACE FUNCTION public.check_booking_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_end_at timestamptz;
BEGIN
  v_end_at := NEW.scheduled_at + (NEW.duration_minutes || ' minutes')::interval;
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE executor_id = NEW.executor_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status NOT IN ('cancelled', 'no_show')
      AND scheduled_at < v_end_at
      AND (scheduled_at + (duration_minutes || ' minutes')::interval) > NEW.scheduled_at
  ) THEN
    RAISE EXCEPTION 'Booking time overlaps with existing booking';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_booking_overlap ON public.bookings;
CREATE TRIGGER trg_check_booking_overlap
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_booking_overlap();

-- 5. Server-side lesson overlap check
CREATE OR REPLACE FUNCTION public.check_lesson_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM lessons
    WHERE teacher_id = NEW.teacher_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND lesson_date = NEW.lesson_date
      AND status NOT IN ('cancelled')
      AND start_time < NEW.end_time
      AND end_time > NEW.start_time
  ) THEN
    RAISE EXCEPTION 'Lesson time overlaps with existing lesson';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_lesson_overlap ON public.lessons;
CREATE TRIGGER trg_check_lesson_overlap
  BEFORE INSERT OR UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.check_lesson_overlap();

-- 6. Restrict user_scores visibility: clients should only see safe fields
-- Create a view for public client stats (hides raw risk data)
CREATE OR REPLACE VIEW public.user_scores_public AS
SELECT 
  user_id,
  completed_visits,
  no_show_count,
  cancel_under_1h,
  cancel_under_3h,
  total_cancellations,
  vip_by_count,
  blacklist_by_count,
  account_age_days,
  status,
  -- Hide total_score from clients, only show status
  CASE 
    WHEN status = 'insufficient_data' THEN 'insufficient_data'
    WHEN total_score >= 70 THEN 'good'
    WHEN total_score >= 50 THEN 'moderate'
    WHEN total_score >= 40 THEN 'warning'
    ELSE 'restricted'
  END as score_level
FROM public.user_scores;
