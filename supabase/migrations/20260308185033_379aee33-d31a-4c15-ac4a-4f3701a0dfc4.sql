
-- 1. Add in_progress to booking_status enum
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'in_progress';

-- 2. Trigger: deactivate services when master is removed from organization
CREATE OR REPLACE FUNCTION public.deactivate_master_services_on_leave()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When master is removed (status changes to non-accepted or row deleted)
  IF TG_OP = 'DELETE' THEN
    UPDATE services SET is_active = false 
    WHERE master_id = OLD.master_id AND business_id = OLD.business_id;
    RETURN OLD;
  END IF;
  
  -- When status changes away from 'accepted'
  IF OLD.status = 'accepted' AND NEW.status != 'accepted' THEN
    UPDATE services SET is_active = false 
    WHERE master_id = NEW.master_id AND business_id = NEW.business_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_deactivate_services_on_master_leave
  AFTER UPDATE OR DELETE ON public.business_masters
  FOR EACH ROW EXECUTE FUNCTION public.deactivate_master_services_on_leave();

-- 3. Function to check booking limits based on user score
CREATE OR REPLACE FUNCTION public.check_booking_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _score numeric;
  _active_count integer;
  _max_active integer := 10;
BEGIN
  -- Only check on insert of new bookings
  IF NEW.status IN ('cancelled', 'rejected') THEN
    RETURN NEW;
  END IF;

  -- Get user score
  SELECT total_score INTO _score FROM user_scores WHERE user_id = NEW.client_id;
  
  -- Set limits based on score
  IF _score IS NOT NULL THEN
    IF _score < 40 THEN
      RAISE EXCEPTION 'Your account is restricted. Cannot create bookings.';
    ELSIF _score <= 50 THEN
      _max_active := 2;
    ELSIF _score <= 70 THEN
      _max_active := 5;
    END IF;
  END IF;

  -- Count active bookings
  SELECT COUNT(*) INTO _active_count 
  FROM bookings 
  WHERE client_id = NEW.client_id 
    AND status IN ('pending', 'confirmed', 'in_progress')
    AND scheduled_at > now();
  
  IF _active_count >= _max_active THEN
    RAISE EXCEPTION 'Maximum active bookings limit reached (%)' , _max_active;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_booking_limits
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_booking_limits();

-- 4. Function to check cross-org schedule conflicts for masters
CREATE OR REPLACE FUNCTION public.check_cross_org_schedule_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IN ('cancelled', 'rejected') THEN
    RETURN NEW;
  END IF;
  
  -- Check if master has overlapping bookings in ANY organization
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE executor_id = NEW.executor_id
    AND id != NEW.id
    AND status NOT IN ('cancelled', 'rejected')
    AND organization_id != NEW.organization_id
    AND tstzrange(scheduled_at, scheduled_at + make_interval(mins => duration_minutes))
     && tstzrange(NEW.scheduled_at, NEW.scheduled_at + make_interval(mins => NEW.duration_minutes))
  ) THEN
    RAISE EXCEPTION 'Master has a conflicting booking in another organization';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cross_org_schedule_overlap
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_cross_org_schedule_overlap();
