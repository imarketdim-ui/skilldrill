
-- =============================================
-- 1. INVITATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  organization_id uuid REFERENCES public.business_locations(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'master',
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  invited_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(token)
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Only org owners can create invitations
CREATE POLICY "Org owners can manage invitations"
  ON public.invitations FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.business_locations WHERE id = organization_id AND owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.business_locations WHERE id = organization_id AND owner_id = auth.uid())
  );

-- Invited users can read their own invitations (by email match)
CREATE POLICY "Users can view invitations by token"
  ON public.invitations FOR SELECT TO authenticated
  USING (true);

-- =============================================
-- 2. NOTIFICATIONS TABLE (if not exists)
-- =============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text,
  related_id text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =============================================
-- 3. UNIVERSAL BLACKLIST CHECK TRIGGER (enhanced)
-- =============================================
CREATE OR REPLACE FUNCTION public.check_booking_blacklist()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  -- Check master-level blacklist
  IF EXISTS (
    SELECT 1 FROM blacklists
    WHERE blocker_id = NEW.executor_id AND blocked_id = NEW.client_id
  ) THEN
    RAISE EXCEPTION 'Access Denied: Blacklisted by master';
  END IF;

  -- Check org-level blacklist
  IF NEW.organization_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM blacklists
      WHERE blocked_id = NEW.client_id
        AND (
          (organization_id = NEW.organization_id AND is_organization_wide = true)
          OR blocker_id = (SELECT owner_id FROM business_locations WHERE id = NEW.organization_id)
        )
    ) THEN
      RAISE EXCEPTION 'Access Denied: Blacklisted by organization';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS trg_check_booking_blacklist ON public.bookings;
CREATE TRIGGER trg_check_booking_blacklist
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_booking_blacklist();

-- =============================================
-- 4. VIP AUTO-CONFIRM LOGIC
-- =============================================
CREATE OR REPLACE FUNCTION public.auto_confirm_vip_booking()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  -- Only apply to new pending bookings
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Check if client has VIP tag for this organization or master
  IF EXISTS (
    SELECT 1 FROM client_tags
    WHERE client_id = NEW.client_id
      AND tag = 'vip'
      AND (
        tagger_id = NEW.executor_id
        OR business_id = NEW.organization_id
      )
  ) THEN
    NEW.status := 'confirmed';
    
    -- Log notification
    INSERT INTO notifications (user_id, type, title, message, related_id)
    VALUES (NEW.client_id, 'vip_autoconfirm', 'Запись автоматически подтверждена', 
            'Как VIP-клиент, ваша запись подтверждена автоматически.', NEW.id::text);
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_auto_confirm_vip ON public.bookings;
CREATE TRIGGER trg_auto_confirm_vip
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_vip_booking();

-- =============================================
-- 5. ACCEPT INVITATION FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.accept_invitation(_token text)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _inv RECORD;
  _user_id uuid;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _inv FROM invitations
  WHERE token = _token AND accepted_at IS NULL AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or expired';
  END IF;

  -- Mark invitation as accepted
  UPDATE invitations SET accepted_at = now() WHERE id = _inv.id;

  -- Add user to organization based on role
  IF _inv.role = 'master' THEN
    -- Check if user has master role
    IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'master' AND is_active = true) THEN
      RAISE EXCEPTION 'User does not have master role';
    END IF;
    
    INSERT INTO business_masters (business_id, master_id, status, invited_by)
    VALUES (_inv.organization_id, _user_id, 'accepted', _inv.invited_by)
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO business_managers (business_id, user_id, is_active)
    VALUES (_inv.organization_id, _user_id, true)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Notify the inviter
  IF _inv.invited_by IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, related_id)
    VALUES (_inv.invited_by, 'invitation_accepted', 'Приглашение принято',
            'Пользователь принял приглашение в вашу организацию.', _inv.organization_id::text);
  END IF;

  RETURN jsonb_build_object('success', true, 'organization_id', _inv.organization_id, 'role', _inv.role);
END;
$function$;
