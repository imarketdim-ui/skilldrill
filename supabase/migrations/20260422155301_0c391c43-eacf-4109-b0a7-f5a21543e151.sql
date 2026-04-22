-- 1. master_time_off
CREATE TABLE IF NOT EXISTS public.master_time_off (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT master_time_off_dates_chk CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_master_time_off_master_dates 
  ON public.master_time_off (master_id, start_date, end_date);

ALTER TABLE public.master_time_off ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view time off"
  ON public.master_time_off FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Master can insert own time off"
  ON public.master_time_off FOR INSERT
  TO authenticated
  WITH CHECK (master_id = auth.uid());

CREATE POLICY "Master can update own time off"
  ON public.master_time_off FOR UPDATE
  TO authenticated
  USING (master_id = auth.uid());

CREATE POLICY "Master can delete own time off"
  ON public.master_time_off FOR DELETE
  TO authenticated
  USING (master_id = auth.uid());

-- 2. buffer_minutes on business_locations
ALTER TABLE public.business_locations
  ADD COLUMN IF NOT EXISTS buffer_minutes integer NOT NULL DEFAULT 0;

-- 3. RPC: get_master_available_slots
CREATE OR REPLACE FUNCTION public.get_master_available_slots(
  _master_id uuid,
  _date date,
  _service_duration int
)
RETURNS TABLE(slot_start timestamptz, slot_end timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile RECORD;
  _tz text;
  _jsday int;
  _whc jsonb;
  _bc jsonb;
  _day_cfg jsonb;
  _day_breaks jsonb;
  _day_start time;
  _day_end time;
  _step_minutes int;
  _buffer int := 0;
  _cursor timestamptz;
  _day_start_ts timestamptz;
  _day_end_ts timestamptz;
  _slot_end timestamptz;
  _is_busy boolean;
BEGIN
  SELECT mp.work_days, mp.work_hours_config, mp.break_config, mp.business_id, mp.user_id
  INTO _profile
  FROM master_profiles mp
  WHERE mp.user_id = _master_id;

  IF NOT FOUND THEN RETURN; END IF;

  -- Timezone (from business or default)
  IF _profile.business_id IS NOT NULL THEN
    SELECT COALESCE(bl.timezone, 'Europe/Moscow'), COALESCE(bl.buffer_minutes, 0)
    INTO _tz, _buffer
    FROM business_locations bl
    WHERE bl.id = _profile.business_id;
  END IF;
  _tz := COALESCE(_tz, 'Europe/Moscow');

  -- Time off check
  IF EXISTS (
    SELECT 1 FROM master_time_off
    WHERE master_id = _master_id AND _date BETWEEN start_date AND end_date
  ) THEN
    RETURN;
  END IF;

  _jsday := EXTRACT(DOW FROM _date)::int; -- 0=Sun..6=Sat
  IF _profile.work_days IS NOT NULL AND array_length(_profile.work_days, 1) > 0 THEN
    IF NOT (_jsday = ANY(_profile.work_days)) THEN
      RETURN;
    END IF;
  END IF;

  _whc := COALESCE(_profile.work_hours_config, '{}'::jsonb);

  -- Per-day override: keys '0'..'6'
  _day_cfg := _whc -> _jsday::text;
  IF _day_cfg IS NULL OR jsonb_typeof(_day_cfg) <> 'object' THEN
    _day_cfg := _whc -> 'default';
  END IF;
  _day_start := COALESCE((_day_cfg->>'start')::time, '09:00'::time);
  _day_end := COALESCE((_day_cfg->>'end')::time, '18:00'::time);
  _step_minutes := COALESCE(NULLIF(_whc->>'slotDuration','')::int, 30);

  _day_start_ts := ((_date::text || ' ' || _day_start::text)::timestamp AT TIME ZONE _tz);
  _day_end_ts := ((_date::text || ' ' || _day_end::text)::timestamp AT TIME ZONE _tz);

  -- Day-specific breaks
  _bc := COALESCE(_profile.break_config, '{}'::jsonb);
  _day_breaks := _bc -> _jsday::text;
  IF _day_breaks IS NULL THEN _day_breaks := '[]'::jsonb; END IF;

  _cursor := _day_start_ts;

  WHILE _cursor + make_interval(mins => _service_duration) <= _day_end_ts LOOP
    _slot_end := _cursor + make_interval(mins => _service_duration);

    -- Skip past slots
    IF _slot_end <= now() THEN
      _cursor := _cursor + make_interval(mins => _step_minutes);
      CONTINUE;
    END IF;

    _is_busy := false;

    -- Bookings overlap (incl. buffer)
    IF EXISTS (
      SELECT 1 FROM bookings
      WHERE executor_id = _master_id
        AND status NOT IN ('cancelled','no_show','rejected')
        AND scheduled_at < _slot_end + make_interval(mins => _buffer)
        AND (scheduled_at + make_interval(mins => duration_minutes + _buffer)) > _cursor
    ) THEN _is_busy := true; END IF;

    -- Lessons overlap
    IF NOT _is_busy AND EXISTS (
      SELECT 1 FROM lessons
      WHERE teacher_id = _master_id
        AND lesson_date = _date
        AND status NOT IN ('cancelled')
        AND start_time < (_slot_end AT TIME ZONE _tz)::time
        AND end_time > (_cursor AT TIME ZONE _tz)::time
    ) THEN _is_busy := true; END IF;

    -- Breaks
    IF NOT _is_busy AND jsonb_array_length(_day_breaks) > 0 THEN
      IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(_day_breaks) br
        WHERE (br->>'start')::time < (_slot_end AT TIME ZONE _tz)::time
          AND (br->>'end')::time > (_cursor AT TIME ZONE _tz)::time
      ) THEN _is_busy := true; END IF;
    END IF;

    IF NOT _is_busy THEN
      slot_start := _cursor;
      slot_end := _slot_end;
      RETURN NEXT;
    END IF;

    _cursor := _cursor + make_interval(mins => _step_minutes);
  END LOOP;

  RETURN;
END;
$$;

-- 4. has_master_availability_on_date
CREATE OR REPLACE FUNCTION public.has_master_availability_on_date(
  _master_id uuid,
  _date date
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _min_duration int;
BEGIN
  SELECT COALESCE(MIN(duration_minutes), 30) INTO _min_duration
  FROM services
  WHERE (master_id = _master_id OR organization_id IN (
    SELECT business_id FROM master_profiles WHERE user_id = _master_id AND business_id IS NOT NULL
  ))
  AND is_active = true;

  RETURN EXISTS (
    SELECT 1 FROM public.get_master_available_slots(_master_id, _date, _min_duration) LIMIT 1
  );
END;
$$;

-- 5. get_next_available_date (window 60 days)
CREATE OR REPLACE FUNCTION public.get_next_available_date(
  _master_id uuid,
  _from_date date DEFAULT CURRENT_DATE
)
RETURNS date
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _d date;
BEGIN
  FOR i IN 0..60 LOOP
    _d := _from_date + i;
    IF public.has_master_availability_on_date(_master_id, _d) THEN
      RETURN _d;
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;