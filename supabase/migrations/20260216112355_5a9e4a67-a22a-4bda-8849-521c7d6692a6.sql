
-- Fix: add master role for user alfacartrade@mail.ru who created master profile but role wasn't inserted due to RLS
INSERT INTO public.user_roles (user_id, role, is_active)
VALUES ('07ffeae2-b9c7-4e0c-b3f7-9f4d47f9031c', 'master', true)
ON CONFLICT (user_id, role) DO UPDATE SET is_active = true;
