
-- 1. Make disputes.booking_id nullable and add lesson_booking_id for lesson disputes
ALTER TABLE public.disputes ALTER COLUMN booking_id DROP NOT NULL;
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS lesson_booking_id uuid REFERENCES public.lesson_bookings(id);

-- 2. Cross-table overlap: update booking overlap check to also check lessons
CREATE OR REPLACE FUNCTION public.check_booking_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_end_at timestamptz;
  v_date date;
  v_start_time time;
  v_end_time time;
BEGIN
  v_end_at := NEW.scheduled_at + (NEW.duration_minutes || ' minutes')::interval;
  
  -- Check against other bookings
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

  -- Check against lessons
  v_date := (NEW.scheduled_at AT TIME ZONE 'UTC')::date;
  v_start_time := (NEW.scheduled_at AT TIME ZONE 'UTC')::time;
  v_end_time := (v_end_at AT TIME ZONE 'UTC')::time;
  
  IF EXISTS (
    SELECT 1 FROM lessons
    WHERE teacher_id = NEW.executor_id
      AND lesson_date = v_date
      AND status NOT IN ('cancelled')
      AND start_time < v_end_time
      AND end_time > v_start_time
  ) THEN
    RAISE EXCEPTION 'Booking time overlaps with existing lesson';
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Update lesson overlap to also check bookings
CREATE OR REPLACE FUNCTION public.check_lesson_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_ts timestamptz;
  v_end_ts timestamptz;
BEGIN
  -- Check against other lessons
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

  -- Check against bookings
  v_start_ts := (NEW.lesson_date || ' ' || NEW.start_time)::timestamptz;
  v_end_ts := (NEW.lesson_date || ' ' || NEW.end_time)::timestamptz;
  
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE executor_id = NEW.teacher_id
      AND status NOT IN ('cancelled', 'no_show')
      AND scheduled_at < v_end_ts
      AND (scheduled_at + (duration_minutes || ' minutes')::interval) > v_start_ts
  ) THEN
    RAISE EXCEPTION 'Lesson time overlaps with existing booking';
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Allow anon users to view active master_profiles
DROP POLICY IF EXISTS "Public can view active master profiles" ON public.master_profiles;
CREATE POLICY "Public can view active master profiles"
ON public.master_profiles FOR SELECT
TO anon, authenticated
USING (is_active = true OR user_id = auth.uid() OR is_platform_admin(auth.uid()));

-- 5. Allow anon users to view active business_locations
DROP POLICY IF EXISTS "Business viewable when active" ON public.business_locations;
CREATE POLICY "Business viewable when active"
ON public.business_locations FOR SELECT
TO anon, authenticated
USING (is_active = true OR owner_id = auth.uid() OR is_platform_admin(auth.uid()));

-- 6. Allow anon users to view ratings
DROP POLICY IF EXISTS "Public can view ratings" ON public.ratings;
CREATE POLICY "Public can view ratings"
ON public.ratings FOR SELECT
TO anon, authenticated
USING (true);

-- 7. Allow anon to view service_categories
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.service_categories;
CREATE POLICY "Categories are viewable by everyone"
ON public.service_categories FOR SELECT
TO anon, authenticated
USING (true);
