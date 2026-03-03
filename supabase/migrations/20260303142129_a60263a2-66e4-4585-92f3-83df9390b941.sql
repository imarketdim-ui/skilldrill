-- 1. Fix admin_assignments RLS: allow assignees to accept/reject
DROP POLICY IF EXISTS "Super admins and assignees manage assignments" ON admin_assignments;
CREATE POLICY "Super admins and assignees manage assignments" ON admin_assignments FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR assignee_id = auth.uid())
  WITH CHECK (is_super_admin(auth.uid()) OR (assignee_id = auth.uid() AND status IN ('accepted', 'rejected')));

-- 2. Create function for accepting admin assignment (bypasses user_roles RLS)
CREATE OR REPLACE FUNCTION public.accept_admin_assignment(_assignment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _assignee uuid;
  _role user_role;
BEGIN
  SELECT assignee_id, role INTO _assignee, _role
  FROM admin_assignments WHERE id = _assignment_id AND status = 'pending';
  IF _assignee IS NULL THEN RAISE EXCEPTION 'Assignment not found or not pending'; END IF;
  IF _assignee != auth.uid() THEN RAISE EXCEPTION 'Not your assignment'; END IF;
  UPDATE admin_assignments SET status = 'accepted', resolved_at = now() WHERE id = _assignment_id;
  INSERT INTO user_roles (user_id, role, is_active)
  VALUES (_assignee, _role, true)
  ON CONFLICT (user_id, role) DO UPDATE SET is_active = true, activated_at = now(), deactivated_at = null;
END;
$$;

-- 3. Create function for rejecting admin assignment
CREATE OR REPLACE FUNCTION public.reject_admin_assignment(_assignment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _assignee uuid;
BEGIN
  SELECT assignee_id INTO _assignee
  FROM admin_assignments WHERE id = _assignment_id AND status = 'pending';
  IF _assignee IS NULL THEN RAISE EXCEPTION 'Assignment not found or not pending'; END IF;
  IF _assignee != auth.uid() THEN RAISE EXCEPTION 'Not your assignment'; END IF;
  UPDATE admin_assignments SET status = 'rejected', resolved_at = now() WHERE id = _assignment_id;
END;
$$;

-- 4. Add schedule config columns to master_profiles
ALTER TABLE master_profiles ADD COLUMN IF NOT EXISTS work_hours_config jsonb DEFAULT '{}';
ALTER TABLE master_profiles ADD COLUMN IF NOT EXISTS break_config jsonb DEFAULT '{}';
ALTER TABLE master_profiles ADD COLUMN IF NOT EXISTS work_days int[] DEFAULT '{1,2,3,4,5}';

-- 5. Add platform_manager to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'platform_manager';

-- 6. Create manager_clients table
CREATE TABLE IF NOT EXISTS manager_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES profiles(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE(manager_id, client_id)
);
ALTER TABLE manager_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers see own clients" ON manager_clients FOR SELECT TO authenticated
  USING (manager_id = auth.uid() OR is_platform_admin(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Admins manage manager clients" ON manager_clients FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid()) OR is_super_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()) OR is_super_admin(auth.uid()));

-- 7. Update chat_messages RLS to allow admins to see support messages
DROP POLICY IF EXISTS "Users view own messages" ON chat_messages;
CREATE POLICY "Users view own messages" ON chat_messages FOR SELECT TO authenticated
  USING (
    sender_id = auth.uid() OR recipient_id = auth.uid()
    OR (chat_type = 'support' AND (is_platform_admin(auth.uid()) OR is_super_admin(auth.uid())))
  );

DROP POLICY IF EXISTS "Users update own messages" ON chat_messages;
CREATE POLICY "Users update own messages" ON chat_messages FOR UPDATE TO authenticated
  USING (
    sender_id = auth.uid() OR recipient_id = auth.uid()
    OR (chat_type = 'support' AND (is_platform_admin(auth.uid()) OR is_super_admin(auth.uid())))
  );