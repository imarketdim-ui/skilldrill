
-- Fix trigger to handle conflicts gracefully
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
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Always assign client role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client')
  ON CONFLICT DO NOTHING;
  
  -- Check if this is the first user - make them super_admin
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin')
    ON CONFLICT DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'platform_admin')
    ON CONFLICT DO NOTHING;
    UPDATE public.profiles SET platform_role = 'platform_admin' WHERE id = NEW.id;
  END IF;
  
  -- Create user balance
  INSERT INTO public.user_balances (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Now seed test users
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, instance_id, aud, role, created_at, updated_at)
VALUES
  ('e0000001-0001-0000-0000-000000000001', 'anna.beauty@test.com', crypt('test123456', gen_salt('bf')), now(), '{"first_name":"Анна","last_name":"Красавина"}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('e0000001-0002-0000-0000-000000000001', 'elena.nails@test.com', crypt('test123456', gen_salt('bf')), now(), '{"first_name":"Елена","last_name":"Маникюрова"}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('e0000001-0003-0000-0000-000000000001', 'dmitry.fit@test.com', crypt('test123456', gen_salt('bf')), now(), '{"first_name":"Дмитрий","last_name":"Силин"}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('e0000001-0004-0000-0000-000000000001', 'oksana.yoga@test.com', crypt('test123456', gen_salt('bf')), now(), '{"first_name":"Оксана","last_name":"Йогина"}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('e0000001-0005-0000-0000-000000000001', 'igor.math@test.com', crypt('test123456', gen_salt('bf')), now(), '{"first_name":"Игорь","last_name":"Числов"}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('e0000001-0006-0000-0000-000000000001', 'marina.eng@test.com', crypt('test123456', gen_salt('bf')), now(), '{"first_name":"Марина","last_name":"Языкова"}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('e0000001-0007-0000-0000-000000000001', 'alex.photo@test.com', crypt('test123456', gen_salt('bf')), now(), '{"first_name":"Алексей","last_name":"Фотов"}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('e0000001-0008-0000-0000-000000000001', 'natalia.med@test.com', crypt('test123456', gen_salt('bf')), now(), '{"first_name":"Наталья","last_name":"Здоровцева"}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('e0000001-0009-0000-0000-000000000001', 'sergey.home@test.com', crypt('test123456', gen_salt('bf')), now(), '{"first_name":"Сергей","last_name":"Домов"}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('e0000001-0010-0000-0000-000000000001', 'pavel.auto@test.com', crypt('test123456', gen_salt('bf')), now(), '{"first_name":"Павел","last_name":"Моторов"}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('e0000001-0011-0000-0000-000000000001', 'julia.spa@test.com', crypt('test123456', gen_salt('bf')), now(), '{"first_name":"Юлия","last_name":"Релаксова"}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('e0000001-0012-0000-0000-000000000001', 'vera.spa2@test.com', crypt('test123456', gen_salt('bf')), now(), '{"first_name":"Вера","last_name":"Массажова"}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Add master roles
INSERT INTO user_roles (user_id, role)
SELECT u.id, 'master' FROM auth.users u WHERE u.id::text LIKE 'e0000001-%'
ON CONFLICT DO NOTHING;

-- Create master_profiles
INSERT INTO master_profiles (user_id, category_id, description, address, latitude, longitude, hashtags, is_active, moderation_status, subscription_status)
VALUES
  ('e0000001-0001-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'Стилист-визажист с 8-летним стажем.', 'г. Абакан, ул. Щетинкина 12', 53.7225, 91.4429, ARRAY['макияж','визаж','свадебный','вечерний','стилист'], true, 'approved', 'active'),
  ('e0000001-0002-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'Мастер маникюра и педикюра.', 'г. Красноярск, пр. Мира 50', 56.0184, 92.8672, ARRAY['маникюр','педикюр','гель-лак','наращивание','нейл-арт'], true, 'approved', 'active'),
  ('e0000001-0003-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000007', 'Персональный фитнес-тренер.', 'г. Абакан, ул. Вяткина 33', 53.7150, 91.4350, ARRAY['фитнес','тренер','кроссфит','силовые','похудение'], true, 'approved', 'active'),
  ('e0000001-0004-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000007', 'Инструктор по йоге и пилатесу.', 'г. Москва, ул. Арбат 10', 55.7520, 37.5920, ARRAY['йога','пилатес','растяжка','медитация'], true, 'approved', 'active'),
  ('e0000001-0005-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000003', 'Репетитор по математике. ЕГЭ, ОГЭ.', 'г. Абакан, ул. Пушкина 115', 53.7200, 91.4500, ARRAY['математика','егэ','огэ','репетитор'], true, 'approved', 'active'),
  ('e0000001-0006-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000003', 'Преподаватель английского языка.', 'г. Красноярск, ул. Ленина 25', 56.0100, 92.8700, ARRAY['английский','ielts','разговорный','деловой'], true, 'approved', 'active'),
  ('e0000001-0007-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000005', 'Фотограф. Свадьбы, портреты.', 'г. Абакан, ул. Крылова 68', 53.7180, 91.4380, ARRAY['фотограф','свадебная','портрет','фотосессия'], true, 'approved', 'active'),
  ('e0000001-0008-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000006', 'Нутрициолог и диетолог.', 'г. Москва, Тверская 15', 55.7640, 37.6070, ARRAY['нутрициолог','диетолог','питание','здоровье'], true, 'approved', 'active'),
  ('e0000001-0009-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000008', 'Мастер по ремонту.', 'г. Абакан, ул. Советская 45', 53.7160, 91.4460, ARRAY['ремонт','сантехника','электрика','дом'], true, 'approved', 'active'),
  ('e0000001-0010-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 'Автомеханик. Диагностика, ТО.', 'г. Красноярск, ул. Маерчака 8', 56.0050, 92.8800, ARRAY['автомеханик','диагностика','ТО','авто'], true, 'approved', 'active'),
  ('e0000001-0011-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000004', 'СПА-терапевт.', 'г. Абакан, ул. Итыгина 18', 53.7210, 91.4410, ARRAY['спа','стоун','обёртывание','ароматерапия'], true, 'approved', 'active'),
  ('e0000001-0012-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000004', 'Массажист.', 'г. Москва, Садовая-Кудринская 20', 55.7650, 37.5900, ARRAY['массаж','классический','спортивный','лечебный'], true, 'approved', 'active')
ON CONFLICT DO NOTHING;

-- Create services
INSERT INTO services (master_id, name, price, duration_minutes, is_active) VALUES
  ('e0000001-0001-0000-0000-000000000001', 'Свадебный макияж', 3500, 90, true),
  ('e0000001-0001-0000-0000-000000000001', 'Вечерний макияж', 2500, 60, true),
  ('e0000001-0001-0000-0000-000000000001', 'Дневной макияж', 1500, 45, true),
  ('e0000001-0002-0000-0000-000000000001', 'Маникюр гель-лак', 1800, 60, true),
  ('e0000001-0002-0000-0000-000000000001', 'Педикюр', 2200, 90, true),
  ('e0000001-0002-0000-0000-000000000001', 'Наращивание ногтей', 3500, 120, true),
  ('e0000001-0003-0000-0000-000000000001', 'Персональная тренировка', 2000, 60, true),
  ('e0000001-0003-0000-0000-000000000001', 'Кроссфит', 1500, 60, true),
  ('e0000001-0003-0000-0000-000000000001', 'Программа похудения', 8000, 60, true),
  ('e0000001-0004-0000-0000-000000000001', 'Индивидуальная йога', 2500, 60, true),
  ('e0000001-0004-0000-0000-000000000001', 'Групповой пилатес', 800, 60, true),
  ('e0000001-0004-0000-0000-000000000001', 'Курс медитации', 4000, 45, true),
  ('e0000001-0005-0000-0000-000000000001', 'Подготовка к ЕГЭ', 1500, 60, true),
  ('e0000001-0005-0000-0000-000000000001', 'Подготовка к ОГЭ', 1200, 60, true),
  ('e0000001-0005-0000-0000-000000000001', 'Олимпиадная математика', 2000, 90, true),
  ('e0000001-0006-0000-0000-000000000001', 'Разговорный английский', 1500, 60, true),
  ('e0000001-0006-0000-0000-000000000001', 'Подготовка к IELTS', 2000, 90, true),
  ('e0000001-0006-0000-0000-000000000001', 'Деловой английский', 1800, 60, true),
  ('e0000001-0007-0000-0000-000000000001', 'Свадебная съёмка', 15000, 480, true),
  ('e0000001-0007-0000-0000-000000000001', 'Портретная фотосессия', 3000, 60, true),
  ('e0000001-0007-0000-0000-000000000001', 'Предметная съёмка', 5000, 120, true),
  ('e0000001-0008-0000-0000-000000000001', 'Консультация нутрициолога', 3000, 60, true),
  ('e0000001-0008-0000-0000-000000000001', 'Программа питания', 5000, 90, true),
  ('e0000001-0008-0000-0000-000000000001', 'Детокс-программа', 4000, 60, true),
  ('e0000001-0009-0000-0000-000000000001', 'Вызов сантехника', 1500, 60, true),
  ('e0000001-0009-0000-0000-000000000001', 'Электромонтаж', 2000, 90, true),
  ('e0000001-0009-0000-0000-000000000001', 'Мелкий ремонт', 1000, 60, true),
  ('e0000001-0010-0000-0000-000000000001', 'Диагностика авто', 2000, 60, true),
  ('e0000001-0010-0000-0000-000000000001', 'Замена масла', 1500, 45, true),
  ('e0000001-0010-0000-0000-000000000001', 'Кузовной ремонт', 5000, 180, true),
  ('e0000001-0011-0000-0000-000000000001', 'Стоун-терапия', 3500, 90, true),
  ('e0000001-0011-0000-0000-000000000001', 'Обёртывание', 2500, 60, true),
  ('e0000001-0011-0000-0000-000000000001', 'Ароматерапия', 2000, 45, true),
  ('e0000001-0012-0000-0000-000000000001', 'Классический массаж', 2500, 60, true),
  ('e0000001-0012-0000-0000-000000000001', 'Спортивный массаж', 3000, 60, true),
  ('e0000001-0012-0000-0000-000000000001', 'Антицеллюлитный массаж', 2800, 60, true)
ON CONFLICT DO NOTHING;

-- Additional business locations
INSERT INTO business_locations (id, owner_id, name, inn, legal_form, address, description, latitude, longitude, hashtags, is_active, moderation_status, subscription_status)
VALUES
  ('b0000001-0003-0000-0000-000000000001', 'e0000001-0004-0000-0000-000000000001', 'Йога-студия "Лотос"', '7700000003', 'ip', 'г. Москва, ул. Арбат 10', 'Студия йоги и пилатеса', 55.7520, 37.5920, ARRAY['йога','пилатес','медитация'], true, 'approved', 'active'),
  ('b0000001-0004-0000-0000-000000000001', 'e0000001-0010-0000-0000-000000000001', 'Автосервис "Мотор"', '2400000004', 'ooo', 'г. Красноярск, ул. Маерчака 8', 'Авторемонтные услуги', 56.0050, 92.8800, ARRAY['автосервис','диагностика','ремонт'], true, 'approved', 'active'),
  ('b0000001-0005-0000-0000-000000000001', 'e0000001-0011-0000-0000-000000000001', 'СПА-центр "Гармония"', '1900000005', 'ip', 'г. Абакан, ул. Итыгина 18', 'СПА-процедуры, массаж', 53.7210, 91.4410, ARRAY['спа','массаж','релакс'], true, 'approved', 'active')
ON CONFLICT (id) DO NOTHING;
