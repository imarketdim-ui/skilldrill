
-- 1. availability_check function: checks master + resource availability atomically
CREATE OR REPLACE FUNCTION public.check_availability(
  _master_id uuid,
  _resource_id uuid,
  _start_time timestamptz,
  _duration_minutes integer
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _end_time timestamptz;
  _tz text := 'Europe/Moscow';
  _date date;
  _start_t time;
  _end_t time;
BEGIN
  _end_time := _start_time + (_duration_minutes || ' minutes')::interval;

  -- Check master booking overlap
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE executor_id = _master_id
      AND status NOT IN ('cancelled', 'no_show', 'rejected')
      AND scheduled_at < _end_time
      AND (scheduled_at + (duration_minutes || ' minutes')::interval) > _start_time
  ) THEN
    RETURN false;
  END IF;

  -- Check master lesson overlap
  _date := (_start_time AT TIME ZONE _tz)::date;
  _start_t := (_start_time AT TIME ZONE _tz)::time;
  _end_t := (_end_time AT TIME ZONE _tz)::time;

  IF EXISTS (
    SELECT 1 FROM lessons
    WHERE teacher_id = _master_id
      AND lesson_date = _date
      AND status NOT IN ('cancelled')
      AND start_time < _end_t
      AND end_time > _start_t
  ) THEN
    RETURN false;
  END IF;

  -- Check resource overlap (if resource specified)
  IF _resource_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM bookings
      WHERE resource_id = _resource_id
        AND status NOT IN ('cancelled', 'no_show', 'rejected')
        AND scheduled_at < _end_time
        AND (scheduled_at + (duration_minutes || ' minutes')::interval) > _start_time
    ) THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$;

-- 2. Update check_booking_overlap to also validate resource conflicts
CREATE OR REPLACE FUNCTION public.check_booking_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_end_at timestamptz;
  v_date date;
  v_start_time time;
  v_end_time time;
  v_tz text := 'Europe/Moscow';
BEGIN
  -- Skip cancelled/rejected
  IF NEW.status IN ('cancelled', 'no_show', 'rejected') THEN
    RETURN NEW;
  END IF;

  v_end_at := NEW.scheduled_at + (NEW.duration_minutes || ' minutes')::interval;

  -- Master booking overlap
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE executor_id = NEW.executor_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status NOT IN ('cancelled', 'no_show', 'rejected')
      AND scheduled_at < v_end_at
      AND (scheduled_at + (duration_minutes || ' minutes')::interval) > NEW.scheduled_at
  ) THEN
    RAISE EXCEPTION 'Выбранное время уже занято (мастер недоступен)';
  END IF;

  -- Master lesson overlap
  v_date := (NEW.scheduled_at AT TIME ZONE v_tz)::date;
  v_start_time := (NEW.scheduled_at AT TIME ZONE v_tz)::time;
  v_end_time := (v_end_at AT TIME ZONE v_tz)::time;

  IF EXISTS (
    SELECT 1 FROM lessons
    WHERE teacher_id = NEW.executor_id
      AND lesson_date = v_date
      AND status NOT IN ('cancelled')
      AND start_time < v_end_time
      AND end_time > v_start_time
  ) THEN
    RAISE EXCEPTION 'Выбранное время уже занято (мастер на занятии)';
  END IF;

  -- Resource overlap (if resource specified)
  IF NEW.resource_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM bookings
      WHERE resource_id = NEW.resource_id
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND status NOT IN ('cancelled', 'no_show', 'rejected')
        AND scheduled_at < v_end_at
        AND (scheduled_at + (duration_minutes || ' minutes')::interval) > NEW.scheduled_at
    ) THEN
      RAISE EXCEPTION 'Выбранное время уже занято (ресурс недоступен)';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Anti-spam trigger: max 3 active bookings in 'pending'/'confirmed' status
CREATE OR REPLACE FUNCTION public.check_booking_spam()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _active_count integer;
BEGIN
  IF NEW.status IN ('cancelled', 'rejected', 'no_show') THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO _active_count
  FROM bookings
  WHERE client_id = NEW.client_id
    AND status IN ('pending', 'confirmed')
    AND scheduled_at > now()
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF _active_count >= 3 THEN
    RAISE EXCEPTION 'Превышен лимит активных записей (максимум 3). Завершите или отмените существующие записи.';
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for anti-spam (only on INSERT)
DROP TRIGGER IF EXISTS trg_check_booking_spam ON bookings;
CREATE TRIGGER trg_check_booking_spam
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_booking_spam();

-- Ensure overlap trigger exists (drop old ones, create fresh)
DROP TRIGGER IF EXISTS trg_check_booking_overlap ON bookings;
DROP TRIGGER IF EXISTS check_booking_overlap ON bookings;
CREATE TRIGGER trg_check_booking_overlap
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_booking_overlap();
