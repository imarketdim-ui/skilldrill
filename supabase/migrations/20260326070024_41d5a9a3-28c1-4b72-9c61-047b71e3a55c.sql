
CREATE OR REPLACE FUNCTION public.validate_support_ticket_status()
RETURNS trigger LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('open', 'in_progress', 'resolved', 'closed') THEN
    RAISE EXCEPTION 'Invalid ticket status: %', NEW.status;
  END IF;
  IF NEW.category NOT IN ('support', 'dispute', 'general') THEN
    RAISE EXCEPTION 'Invalid ticket category: %', NEW.category;
  END IF;
  RETURN NEW;
END;
$$;
