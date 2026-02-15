
-- Delete users by email from profiles (cascade will handle related data)
-- First find and delete from auth.users via admin function
-- We need to delete from profiles first since we can't delete from auth directly
-- The profiles table has the emails we need

-- Delete profiles for these users (this won't delete auth.users, user will need to do that from Supabase dashboard)
DELETE FROM public.profiles WHERE email IN ('imp-invest@mail.ru', 'alfacartrade@mail.ru');

-- Also clean up any user_roles for these users
DELETE FROM public.user_roles WHERE user_id IN (
  SELECT id FROM public.profiles WHERE email IN ('imp-invest@mail.ru', 'alfacartrade@mail.ru')
);
