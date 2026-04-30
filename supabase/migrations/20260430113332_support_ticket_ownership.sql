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

CREATE OR REPLACE FUNCTION public.is_support_agent(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    public.has_role(_user_id, 'support')
    OR public.has_role(_user_id, 'platform_admin')
    OR public.has_role(_user_id, 'super_admin')
    OR public.has_role(_user_id, 'platform_manager')
    OR public.has_role(_user_id, 'integrator')
    OR public.has_role(_user_id, 'moderator');
$$;

CREATE OR REPLACE FUNCTION public.enforce_support_ticket_ownership()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  _actor uuid := auth.uid();
  _is_support boolean := public.is_support_agent(_actor);
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF _actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF _is_support THEN
    IF OLD.admin_id IS NOT NULL
       AND OLD.admin_id <> _actor
       AND NEW.admin_id IS DISTINCT FROM OLD.admin_id
       AND OLD.status NOT IN ('resolved', 'closed')
       AND (OLD.handoff_available_at IS NULL OR OLD.handoff_available_at > now()) THEN
      RAISE EXCEPTION 'Ticket is currently owned by another support agent';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.user_id <> _actor THEN
    RAISE EXCEPTION 'You can only update your own support ticket';
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.admin_id IS DISTINCT FROM OLD.admin_id
     OR NEW.claimed_at IS DISTINCT FROM OLD.claimed_at
     OR NEW.handoff_available_at IS DISTINCT FROM OLD.handoff_available_at
     OR NEW.resolved_at IS DISTINCT FROM OLD.resolved_at
     OR NEW.chat_message_id IS DISTINCT FROM OLD.chat_message_id
     OR NEW.category IS DISTINCT FROM OLD.category
     OR NEW.dispute_id IS DISTINCT FROM OLD.dispute_id THEN
    RAISE EXCEPTION 'Only support agents can change ticket ownership or resolution fields';
  END IF;

  IF NEW.status NOT IN ('open', 'waiting_platform', 'waiting_user') THEN
    RAISE EXCEPTION 'Ticket status is not allowed for user update: %', NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_support_ticket_ownership ON public.support_tickets;
CREATE TRIGGER trg_enforce_support_ticket_ownership
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_support_ticket_ownership();

CREATE OR REPLACE FUNCTION public.enforce_support_message_ticket_rules()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  _ticket public.support_tickets%ROWTYPE;
  _actor uuid := auth.uid();
  _is_support boolean := public.is_support_agent(_actor);
BEGIN
  IF NEW.chat_type <> 'support' THEN
    RETURN NEW;
  END IF;

  IF _actor IS NULL OR NEW.sender_id <> _actor THEN
    RAISE EXCEPTION 'Authenticated sender is required for support messages';
  END IF;

  IF NEW.reference_id IS NULL THEN
    RAISE EXCEPTION 'Support messages must reference a support ticket';
  END IF;

  SELECT *
  INTO _ticket
  FROM public.support_tickets
  WHERE id = NEW.reference_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Support ticket % not found', NEW.reference_id;
  END IF;

  IF _ticket.status IN ('resolved', 'closed') THEN
    RAISE EXCEPTION 'Support ticket is already closed';
  END IF;

  IF _is_support THEN
    IF _ticket.admin_id IS DISTINCT FROM _actor THEN
      RAISE EXCEPTION 'Only the assigned support agent can reply in this ticket';
    END IF;

    IF NEW.recipient_id <> _ticket.user_id THEN
      RAISE EXCEPTION 'Support reply recipient must match ticket owner';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.sender_id <> _ticket.user_id THEN
    RAISE EXCEPTION 'Only the ticket owner can send user messages';
  END IF;

  IF _ticket.admin_id IS NOT NULL AND NEW.recipient_id <> _ticket.admin_id THEN
    RAISE EXCEPTION 'User reply recipient must match assigned support agent';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_support_message_ticket_rules ON public.chat_messages;
CREATE TRIGGER trg_enforce_support_message_ticket_rules
  BEFORE INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_support_message_ticket_rules();

DROP POLICY IF EXISTS "Users view own messages" ON public.chat_messages;
CREATE POLICY "Users view own messages"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid()
    OR recipient_id = auth.uid()
    OR (chat_type = 'support' AND public.is_support_agent(auth.uid()))
  );

DROP POLICY IF EXISTS "Users update own messages" ON public.chat_messages;
CREATE POLICY "Users update own messages"
  ON public.chat_messages FOR UPDATE
  TO authenticated
  USING (
    sender_id = auth.uid()
    OR recipient_id = auth.uid()
    OR (chat_type = 'support' AND public.is_support_agent(auth.uid()))
  );

DROP POLICY IF EXISTS "Admins can view all tickets" ON public.support_tickets;
CREATE POLICY "Support agents can view all tickets"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (public.is_support_agent(auth.uid()));

DROP POLICY IF EXISTS "Admins can update tickets" ON public.support_tickets;
CREATE POLICY "Users and support agents update tickets"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_support_agent(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_support_agent(auth.uid()));
