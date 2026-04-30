ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_admin_reply_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_user_reply_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS handoff_available_at timestamptz;

UPDATE public.support_tickets
SET
  last_activity_at = COALESCE(last_activity_at, updated_at, created_at, now()),
  claimed_at = COALESCE(claimed_at, CASE WHEN admin_id IS NOT NULL THEN updated_at ELSE NULL END)
WHERE
  last_activity_at IS NULL
  OR (admin_id IS NOT NULL AND claimed_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status_admin
  ON public.support_tickets (status, admin_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_handoff
  ON public.support_tickets (handoff_available_at);

CREATE OR REPLACE FUNCTION public.validate_support_ticket_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status NOT IN ('open', 'claimed', 'in_progress', 'waiting_user', 'waiting_platform', 'resolved', 'closed') THEN
    RAISE EXCEPTION 'Invalid ticket status: %', NEW.status;
  END IF;
  IF NEW.category NOT IN ('support', 'dispute', 'general') THEN
    RAISE EXCEPTION 'Invalid ticket category: %', NEW.category;
  END IF;
  RETURN NEW;
END;
$$;
