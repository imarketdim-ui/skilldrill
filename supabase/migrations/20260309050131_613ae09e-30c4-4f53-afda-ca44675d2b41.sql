-- Add tech_card column to services for auto-writeoff
ALTER TABLE services ADD COLUMN IF NOT EXISTS tech_card jsonb DEFAULT NULL;
COMMENT ON COLUMN services.tech_card IS 'Technology card: [{inventory_item_id, quantity, unit}]';

-- Remove duplicate trigger
DROP TRIGGER IF EXISTS check_booking_no_overlap ON bookings;

-- Fix check_booking_overlap timezone
CREATE OR REPLACE FUNCTION check_booking_overlap()
RETURNS TRIGGER AS $$
DECLARE
  v_end_at timestamptz;
  v_date date;
  v_start_time time;
  v_end_time time;
  v_tz text := 'Europe/Moscow';
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
    RAISE EXCEPTION 'Booking time overlaps with existing lesson';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;