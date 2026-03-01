-- Update profile avatars for all test masters
UPDATE profiles SET avatar_url = '/test/avatar-anna.jpg' WHERE id = 'e0000001-0001-0000-0000-000000000001';
UPDATE profiles SET avatar_url = '/test/avatar-elena.jpg' WHERE id = 'e0000001-0002-0000-0000-000000000001';
UPDATE profiles SET avatar_url = '/test/avatar-dmitriy.jpg' WHERE id = 'e0000001-0003-0000-0000-000000000001';
UPDATE profiles SET avatar_url = '/test/avatar-oksana.jpg' WHERE id = 'e0000001-0004-0000-0000-000000000001';
UPDATE profiles SET avatar_url = '/test/avatar-igor.jpg' WHERE id = 'e0000001-0005-0000-0000-000000000001';
UPDATE profiles SET avatar_url = '/test/avatar-marina.jpg' WHERE id = 'e0000001-0006-0000-0000-000000000001';
UPDATE profiles SET avatar_url = '/test/avatar-alexey.jpg' WHERE id = 'e0000001-0007-0000-0000-000000000001';
UPDATE profiles SET avatar_url = '/test/avatar-natalya.jpg' WHERE id = 'e0000001-0008-0000-0000-000000000001';
UPDATE profiles SET avatar_url = '/test/avatar-sergey.jpg' WHERE id = 'e0000001-0009-0000-0000-000000000001';
UPDATE profiles SET avatar_url = '/test/avatar-pavel.jpg' WHERE id = 'e0000001-0010-0000-0000-000000000001';
UPDATE profiles SET avatar_url = '/test/avatar-yuliya.jpg' WHERE id = 'e0000001-0011-0000-0000-000000000001';
UPDATE profiles SET avatar_url = '/test/avatar-vera.jpg' WHERE id = 'e0000001-0012-0000-0000-000000000001';
UPDATE profiles SET avatar_url = '/test/avatar-alina.jpg' WHERE id = '192febfd-59dd-452d-be94-31addb67dec3';

-- Update master profiles with rich descriptions, work photos, interior photos
-- Анна Красавина - Бьюти (визажист)
UPDATE master_profiles SET 
  description = 'Стилист-визажист с 8-летним стажем. Специализируюсь на свадебном, вечернем и дневном макияже. Работаю с профессиональной косметикой MAC, NARS, Charlotte Tilbury. Индивидуальный подход к каждому клиенту — подчеркну вашу естественную красоту.',
  work_photos = '["\/test\/work-makeup-1.jpg", "\/test\/work-makeup-2.jpg"]'::jsonb,
  interior_photos = '["\/test\/interior-salon-1.jpg"]'::jsonb
WHERE user_id = 'e0000001-0001-0000-0000-000000000001';

-- Елена Маникюрова - Бьюти (маникюр)
UPDATE master_profiles SET 
  description = 'Мастер маникюра и педикюра с 6-летним опытом. Выполняю все виды покрытий: гель-лак, акрил, наращивание. Стерильность инструментов гарантирована — работаю с индивидуальными наборами. Слежу за трендами nail-дизайна и постоянно совершенствую навыки.',
  work_photos = '["\/test\/work-nails-1.jpg", "\/test\/work-nails-2.jpg"]'::jsonb,
  interior_photos = '["\/test\/interior-salon-1.jpg"]'::jsonb
WHERE user_id = 'e0000001-0002-0000-0000-000000000001';

-- Дмитрий Силин - Спорт (фитнес)
UPDATE master_profiles SET 
  description = 'Сертифицированный персональный тренер с 5-летним стажем. Составляю индивидуальные программы тренировок и питания. Специализация: силовые тренировки, кроссфит, программы снижения веса. Более 200 довольных клиентов, средний результат — минус 8 кг за 3 месяца.',
  work_photos = '["\/test\/work-fitness-1.jpg", "\/test\/work-fitness-2.jpg"]'::jsonb,
  interior_photos = '["\/test\/work-fitness-1.jpg"]'::jsonb
WHERE user_id = 'e0000001-0003-0000-0000-000000000001';

-- Оксана Йогина - Спорт (йога)
UPDATE master_profiles SET 
  description = 'Сертифицированный инструктор по йоге и пилатесу (RYT-500). Практикую 12 лет, преподаю 7 лет. Провожу индивидуальные и групповые занятия. Помогу улучшить гибкость, снять стресс и обрести внутреннюю гармонию. Работаю со всеми уровнями подготовки.',
  work_photos = '["\/test\/interior-yoga-1.jpg"]'::jsonb,
  interior_photos = '["\/test\/interior-yoga-1.jpg"]'::jsonb
WHERE user_id = 'e0000001-0004-0000-0000-000000000001';

-- Игорь Числов - Обучение (математика)
UPDATE master_profiles SET 
  description = 'Репетитор по математике. Кандидат физико-математических наук, 15 лет педагогического стажа. Готовлю к ЕГЭ (средний балл учеников — 82), ОГЭ, олимпиадам. Понятно объясняю сложные темы. Работаю очно и онлайн.',
  work_photos = '["\/test\/work-teaching-1.jpg"]'::jsonb,
  interior_photos = '["\/test\/work-teaching-1.jpg"]'::jsonb
WHERE user_id = 'e0000001-0005-0000-0000-000000000001';

-- Марина Языкова - Обучение (английский)
UPDATE master_profiles SET 
  description = 'Преподаватель английского языка с 10-летним стажем. Сертификат CELTA, уровень C2. Готовлю к IELTS (средний балл — 7.5), веду разговорные клубы и курсы делового английского. Занятия строю на коммуникативной методике — заговорите с первого урока.',
  work_photos = '["\/test\/work-teaching-2.jpg"]'::jsonb,
  interior_photos = '["\/test\/work-teaching-1.jpg"]'::jsonb
WHERE user_id = 'e0000001-0006-0000-0000-000000000001';

-- Алексей Фотов - Фото и видео
UPDATE master_profiles SET 
  description = 'Профессиональный фотограф с 10-летним опытом. Свадьбы, портреты, предметная съёмка. Работаю с естественным и студийным светом. Полная обработка каждого кадра. Портфолио — более 300 проектов. Оборудование: Canon R5, профессиональная оптика.',
  work_photos = '["\/test\/work-photo-1.jpg", "\/test\/work-photo-2.jpg", "\/test\/work-photo-3.jpg"]'::jsonb,
  interior_photos = '["\/test\/work-photo-3.jpg"]'::jsonb
WHERE user_id = 'e0000001-0007-0000-0000-000000000001';

-- Наталья Здоровцева - Здоровье (нутрициология)
UPDATE master_profiles SET 
  description = 'Нутрициолог и диетолог с медицинским образованием. Составляю индивидуальные программы питания для снижения веса, набора мышечной массы, детоксикации организма. Работаю с пищевыми аллергиями и непереносимостями. Более 500 довольных клиентов.',
  work_photos = '["\/test\/work-nutrition-1.jpg"]'::jsonb
WHERE user_id = 'e0000001-0008-0000-0000-000000000001';

-- Сергей Домов - Дом (ремонт)
UPDATE master_profiles SET 
  description = 'Мастер по ремонту с 12-летним опытом. Сантехника, электрика, мелкий бытовой ремонт, отделочные работы. Работаю аккуратно и точно в срок. Всегда с собой полный набор инструментов. Гарантия на все виды работ — 1 год.',
  work_photos = '["\/test\/work-home-1.jpg", "\/test\/work-home-2.jpg"]'::jsonb
WHERE user_id = 'e0000001-0009-0000-0000-000000000001';

-- Павел Моторов - Авто
UPDATE master_profiles SET 
  description = 'Автомеханик с 10-летним стажем. Компьютерная диагностика, техобслуживание, кузовной ремонт. Работаю со всеми марками автомобилей. Использую оригинальные запчасти и сертифицированные материалы. Честная цена без скрытых наценок.',
  work_photos = '["\/test\/work-auto-1.jpg", "\/test\/work-auto-2.jpg"]'::jsonb,
  interior_photos = '["\/test\/interior-auto-1.jpg"]'::jsonb
WHERE user_id = 'e0000001-0010-0000-0000-000000000001';

-- Юлия Релаксова - СПА
UPDATE master_profiles SET 
  description = 'СПА-терапевт с 7-летним стажем. Стоун-терапия, обёртывания, ароматерапия. Использую натуральные масла и косметику премиум-класса. Каждая процедура — это путешествие в мир релакса. Индивидуальный подход к каждому клиенту.',
  work_photos = '["\/test\/work-spa-1.jpg", "\/test\/work-spa-2.jpg"]'::jsonb,
  interior_photos = '["\/test\/interior-spa-center-1.jpg"]'::jsonb
WHERE user_id = 'e0000001-0011-0000-0000-000000000001';

-- Вера Массажова - СПА (массаж)
UPDATE master_profiles SET 
  description = 'Массажист с медицинским образованием и 9-летним опытом. Классический, спортивный, антицеллюлитный массаж. Работаю с проблемами опорно-двигательного аппарата. Использую гипоаллергенные масла. Результат чувствуется после первого сеанса.',
  work_photos = '["\/test\/work-spa-1.jpg", "\/test\/work-spa-2.jpg"]'::jsonb,
  interior_photos = '["\/test\/work-spa-1.jpg"]'::jsonb
WHERE user_id = 'e0000001-0012-0000-0000-000000000001';

-- Алина Мирова - Спорт (fix hashtags to match category)
UPDATE master_profiles SET 
  description = 'Фитнес-тренер и инструктор групповых программ. Специализация: функциональный тренинг, TRX, кардио. Помогу привести тело в форму, повысить выносливость и зарядиться энергией. Работаю с клиентами любого уровня подготовки.',
  hashtags = ARRAY['фитнес', 'тренер', 'кардио', 'функциональный', 'групповые']
WHERE user_id = '192febfd-59dd-452d-be94-31addb67dec3';