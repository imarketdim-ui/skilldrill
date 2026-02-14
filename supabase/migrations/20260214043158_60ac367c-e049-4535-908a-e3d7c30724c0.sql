-- Fix existing users who don't have profiles

-- Create profile for ded-santa@mail.ru
INSERT INTO public.profiles (id, email, skillspot_id, first_name, last_name, platform_role)
SELECT 
  u.id,
  u.email,
  public.generate_skillspot_id(),
  COALESCE(u.raw_user_meta_data->>'first_name', 'Дед'),
  COALESCE(u.raw_user_meta_data->>'last_name', 'Санта'),
  'platform_admin'
FROM auth.users u
WHERE u.email = 'ded-santa@mail.ru'
  AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = u.id);

-- Create profiles for any other users missing profiles  
INSERT INTO public.profiles (id, email, skillspot_id, first_name, last_name)
SELECT 
  u.id,
  u.email,
  public.generate_skillspot_id(),
  COALESCE(u.raw_user_meta_data->>'first_name', NULL),
  COALESCE(u.raw_user_meta_data->>'last_name', NULL)
FROM auth.users u
WHERE u.email != 'ded-santa@mail.ru'
  AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = u.id);

-- Create user_balances for all users who don't have one
INSERT INTO public.user_balances (user_id)
SELECT u.id FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_balances WHERE user_id = u.id);

-- Assign client role to all users who don't have it
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'client'::user_role FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = u.id AND role = 'client');

-- Assign super_admin to ded-santa@mail.ru
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'super_admin'::user_role FROM auth.users u
WHERE u.email = 'ded-santa@mail.ru'
  AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = u.id AND role = 'super_admin');

-- Assign platform_admin to ded-santa@mail.ru  
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'platform_admin'::user_role FROM auth.users u
WHERE u.email = 'ded-santa@mail.ru'
  AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = u.id AND role = 'platform_admin');

-- Update subscription prices in master_profiles default
ALTER TABLE public.master_profiles ALTER COLUMN subscription_price SET DEFAULT 1000;

-- Update subscription prices in business_locations default
ALTER TABLE public.business_locations ALTER COLUMN subscription_price SET DEFAULT 3000;

-- Update subscription prices in networks default  
ALTER TABLE public.networks ALTER COLUMN subscription_price SET DEFAULT 3000;

-- Add subscription status tracking columns if not exist
DO $$ BEGIN
  -- Add subscription_status enum values for better tracking
  ALTER TABLE public.master_profiles ADD COLUMN IF NOT EXISTS grace_start_date timestamptz;
  ALTER TABLE public.master_profiles ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
  ALTER TABLE public.master_profiles ADD COLUMN IF NOT EXISTS last_payment_date timestamptz;
  
  ALTER TABLE public.business_locations ADD COLUMN IF NOT EXISTS grace_start_date timestamptz;
  ALTER TABLE public.business_locations ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
  ALTER TABLE public.business_locations ADD COLUMN IF NOT EXISTS last_payment_date timestamptz;
  
  ALTER TABLE public.networks ADD COLUMN IF NOT EXISTS grace_start_date timestamptz;
  ALTER TABLE public.networks ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
  ALTER TABLE public.networks ADD COLUMN IF NOT EXISTS last_payment_date timestamptz;
END $$;

-- Seed default service categories for MVP
INSERT INTO public.service_categories (name, description, is_active) VALUES
  ('Бьюти', 'Парикмахерские, маникюр, косметология и другие бьюти-услуги', true),
  ('Образование', 'Репетиторы, преподаватели, курсы и тренинги', true),
  ('Автомойка', 'Мойка автомобилей, детейлинг, полировка', true),
  ('Спорт', 'Фитнес-тренеры, йога, единоборства, танцы', true),
  ('Универсальная', 'Прочие услуги, не входящие в специализированные категории', true)
ON CONFLICT DO NOTHING;

-- Seed default rating criteria
INSERT INTO public.rating_criteria (name, category, description, is_active) VALUES
  ('Качество работы', 'master', 'Оценка качества выполненной работы', true),
  ('Клиентоориентированность', 'master', 'Внимание к пожеланиям клиента', true),
  ('Пунктуальность', 'master', 'Соблюдение времени записи', true),
  ('Соотношение цена/качество', 'master', 'Адекватность стоимости услуги', true),
  ('Чистота рабочего места', 'master', 'Состояние рабочего места мастера', true),
  ('Пунктуальность клиента', 'client', 'Клиент приходит вовремя', true),
  ('Вежливость', 'client', 'Уважительное общение', true),
  ('Оплата', 'client', 'Своевременная оплата услуг', true)
ON CONFLICT DO NOTHING;