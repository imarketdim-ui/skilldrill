
-- Auto-assign super_admin to the first registered user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
BEGIN
  INSERT INTO public.profiles (id, email, skillspot_id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    public.generate_skillspot_id(),
    COALESCE(NEW.raw_user_meta_data->>'first_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'last_name', NULL)
  );
  
  -- Always assign client role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client');
  
  -- Check if this is the first user - make them super_admin
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'platform_admin');
    UPDATE public.profiles SET platform_role = 'platform_admin' WHERE id = NEW.id;
  END IF;
  
  -- Create user balance
  INSERT INTO public.user_balances (user_id) VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
