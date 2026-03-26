
-- Support tickets table for admin task management
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  admin_id uuid REFERENCES auth.users(id),
  subject text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  category text NOT NULL DEFAULT 'support',
  chat_message_id uuid,
  dispute_id uuid REFERENCES public.disputes(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_support_ticket_status()
RETURNS trigger LANGUAGE plpgsql AS $$
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

CREATE TRIGGER trg_validate_support_ticket
  BEFORE INSERT OR UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.validate_support_ticket_status();

-- RLS policies
CREATE POLICY "Users can view own tickets"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all tickets"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'platform_admin') OR
    public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Users can create tickets"
  ON public.support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update tickets"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'platform_admin') OR
    public.has_role(auth.uid(), 'super_admin')
  );
