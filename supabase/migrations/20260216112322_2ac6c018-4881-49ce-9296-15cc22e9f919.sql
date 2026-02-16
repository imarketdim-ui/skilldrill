
-- Create a security definer function that allows creating a master/business/network role
-- This bypasses RLS safely since it validates the operation
CREATE OR REPLACE FUNCTION public.assign_role_on_account_creation(
  _user_id uuid,
  _role user_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow specific self-service roles
  IF _role NOT IN ('master', 'business_owner', 'network_owner') THEN
    RAISE EXCEPTION 'Cannot self-assign role: %', _role;
  END IF;
  
  -- Only allow assigning to yourself
  IF _user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot assign roles to other users';
  END IF;

  -- Insert or reactivate role
  INSERT INTO public.user_roles (user_id, role, is_active)
  VALUES (_user_id, _role, true)
  ON CONFLICT (user_id, role) 
  DO UPDATE SET is_active = true, activated_at = now(), deactivated_at = null;
END;
$$;
