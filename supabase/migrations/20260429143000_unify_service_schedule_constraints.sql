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
  _per_day jsonb;
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

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF _profile.business_id IS NOT NULL THEN
    SELECT COALESCE(bl.timezone, 'Europe/Moscow'), COALESCE(bl.buffer_minutes, 0)
    INTO _tz, _buffer
    FROM business_locations bl
    WHERE bl.id = _profile.business_id;
  END IF;
  _tz := COALESCE(_tz, 'Europe/Moscow');

  IF EXISTS (
    SELECT 1
    FROM master_time_off
    WHERE master_id = _master_id
      AND _date BETWEEN start_date AND end_date
  ) THEN
    RETURN;
  END IF;

  _jsday := EXTRACT(DOW FROM _date)::int;
  IF _profile.work_days IS NOT NULL
     AND array_length(_profile.work_days, 1) > 0
     AND NOT (_jsday = ANY(_profile.work_days)) THEN
    RETURN;
  END IF;

  _whc := COALESCE(_profile.work_hours_config, '{}'::jsonb);
  _per_day := COALESCE(_whc -> 'perDay', '{}'::jsonb);
  _day_cfg := COALESCE(_whc -> _jsday::text, _per_day -> _jsday::text, _whc -> 'default');
  IF _day_cfg IS NULL OR jsonb_typeof(_day_cfg) <> 'object' THEN
    _day_cfg := jsonb_build_object('start', '09:00', 'end', '18:00');
  END IF;

  _day_start := COALESCE(NULLIF(_day_cfg ->> 'start', '')::time, '09:00'::time);
  _day_end := COALESCE(NULLIF(_day_cfg ->> 'end', '')::time, '18:00'::time);
  _step_minutes := COALESCE(NULLIF(_whc ->> 'slotDuration', '')::int, 30);

  _day_start_ts := ((_date::text || ' ' || _day_start::text)::timestamp AT TIME ZONE _tz);
  _day_end_ts := ((_date::text || ' ' || _day_end::text)::timestamp AT TIME ZONE _tz);

  _bc := COALESCE(_profile.break_config, '{}'::jsonb);
  _day_breaks := COALESCE(_bc -> _jsday::text, _bc -> 'all', '[]'::jsonb);
  IF jsonb_typeof(_day_breaks) <> 'array' THEN
    _day_breaks := '[]'::jsonb;
  END IF;

  _cursor := _day_start_ts;

  WHILE _cursor + make_interval(mins => _service_duration) <= _day_end_ts LOOP
    _slot_end := _cursor + make_interval(mins => _service_duration);

    IF _slot_end <= now() THEN
      _cursor := _cursor + make_interval(mins => _step_minutes);
      CONTINUE;
    END IF;

    _is_busy := false;

    IF EXISTS (
      SELECT 1
      FROM bookings
      WHERE executor_id = _master_id
        AND status NOT IN ('cancelled', 'no_show', 'rejected')
        AND scheduled_at < _slot_end + make_interval(mins => _buffer)
        AND (scheduled_at + make_interval(mins => duration_minutes + _buffer)) > _cursor
    ) THEN
      _is_busy := true;
    END IF;

    IF NOT _is_busy AND EXISTS (
      SELECT 1
      FROM lessons
      WHERE teacher_id = _master_id
        AND lesson_date = _date
        AND status NOT IN ('cancelled')
        AND start_time < (_slot_end AT TIME ZONE _tz)::time
        AND end_time > (_cursor AT TIME ZONE _tz)::time
    ) THEN
      _is_busy := true;
    END IF;

    IF NOT _is_busy AND jsonb_array_length(_day_breaks) > 0 THEN
      IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(_day_breaks) br
        WHERE (br ->> 'start')::time < (_slot_end AT TIME ZONE _tz)::time
          AND (br ->> 'end')::time > (_cursor AT TIME ZONE _tz)::time
      ) THEN
        _is_busy := true;
      END IF;
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
  _profile RECORD;
  _buffer int := 0;
  _jsday int;
  _whc jsonb;
  _bc jsonb;
  _per_day jsonb;
  _day_cfg jsonb;
  _day_breaks jsonb;
  _day_start time;
  _day_end time;
BEGIN
  _end_time := _start_time + (_duration_minutes || ' minutes')::interval;

  SELECT mp.work_days, mp.work_hours_config, mp.break_config, mp.business_id
  INTO _profile
  FROM master_profiles mp
  WHERE mp.user_id = _master_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF _profile.business_id IS NOT NULL THEN
    SELECT COALESCE(bl.timezone, 'Europe/Moscow'), COALESCE(bl.buffer_minutes, 0)
    INTO _tz, _buffer
    FROM business_locations bl
    WHERE bl.id = _profile.business_id;
  END IF;

  _date := (_start_time AT TIME ZONE _tz)::date;
  _start_t := (_start_time AT TIME ZONE _tz)::time;
  _end_t := (_end_time AT TIME ZONE _tz)::time;
  _jsday := EXTRACT(DOW FROM _date)::int;

  IF EXISTS (
    SELECT 1
    FROM master_time_off
    WHERE master_id = _master_id
      AND _date BETWEEN start_date AND end_date
  ) THEN
    RETURN false;
  END IF;

  IF _profile.work_days IS NOT NULL
     AND array_length(_profile.work_days, 1) > 0
     AND NOT (_jsday = ANY(_profile.work_days)) THEN
    RETURN false;
  END IF;

  _whc := COALESCE(_profile.work_hours_config, '{}'::jsonb);
  _per_day := COALESCE(_whc -> 'perDay', '{}'::jsonb);
  _day_cfg := COALESCE(_whc -> _jsday::text, _per_day -> _jsday::text, _whc -> 'default');
  IF _day_cfg IS NULL OR jsonb_typeof(_day_cfg) <> 'object' THEN
    _day_cfg := jsonb_build_object('start', '09:00', 'end', '18:00');
  END IF;

  _day_start := COALESCE(NULLIF(_day_cfg ->> 'start', '')::time, '09:00'::time);
  _day_end := COALESCE(NULLIF(_day_cfg ->> 'end', '')::time, '18:00'::time);
  IF _start_t < _day_start OR _end_t > _day_end THEN
    RETURN false;
  END IF;

  _bc := COALESCE(_profile.break_config, '{}'::jsonb);
  _day_breaks := COALESCE(_bc -> _jsday::text, _bc -> 'all', '[]'::jsonb);
  IF jsonb_typeof(_day_breaks) = 'array' AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(_day_breaks) br
    WHERE (br ->> 'start')::time < _end_t
      AND (br ->> 'end')::time > _start_t
  ) THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM bookings
    WHERE executor_id = _master_id
      AND status NOT IN ('cancelled', 'no_show', 'rejected')
      AND scheduled_at < _end_time + make_interval(mins => _buffer)
      AND (scheduled_at + (duration_minutes || ' minutes')::interval + make_interval(mins => _buffer)) > _start_time
  ) THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM lessons
    WHERE teacher_id = _master_id
      AND lesson_date = _date
      AND status NOT IN ('cancelled')
      AND start_time < _end_t
      AND end_time > _start_t
  ) THEN
    RETURN false;
  END IF;

  IF _resource_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM bookings
    WHERE resource_id = _resource_id
      AND status NOT IN ('cancelled', 'no_show', 'rejected')
      AND scheduled_at < _end_time
      AND (scheduled_at + (duration_minutes || ' minutes')::interval) > _start_time
  ) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_booking_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_end_at timestamptz;
BEGIN
  IF NEW.status IN ('cancelled', 'no_show', 'rejected') THEN
    RETURN NEW;
  END IF;

  v_end_at := NEW.scheduled_at + (NEW.duration_minutes || ' minutes')::interval;

  IF NOT public.check_availability(
    NEW.executor_id,
    NEW.resource_id,
    NEW.scheduled_at,
    NEW.duration_minutes
  ) THEN
    RAISE EXCEPTION 'Выбранное время недоступно по расписанию, перерывам, отпуску или конфликту ресурсов';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM bookings
    WHERE executor_id = NEW.executor_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status NOT IN ('cancelled', 'no_show', 'rejected')
      AND scheduled_at < v_end_at
      AND (scheduled_at + (duration_minutes || ' minutes')::interval) > NEW.scheduled_at
  ) THEN
    RAISE EXCEPTION 'Выбранное время уже занято (мастер недоступен)';
  END IF;

  IF NEW.resource_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM bookings
    WHERE resource_id = NEW.resource_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status NOT IN ('cancelled', 'no_show', 'rejected')
      AND scheduled_at < v_end_at
      AND (scheduled_at + (duration_minutes || ' minutes')::interval) > NEW.scheduled_at
  ) THEN
    RAISE EXCEPTION 'Выбранное время уже занято (ресурс недоступен)';
  END IF;

  RETURN NEW;
END;
$$;
