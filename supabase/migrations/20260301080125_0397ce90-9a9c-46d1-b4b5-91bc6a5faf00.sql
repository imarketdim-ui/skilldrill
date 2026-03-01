-- SERVICE DESCRIPTIONS, HASHTAGS, WORK PHOTOS
-- Анна Красавина services
UPDATE services SET description = 'Лёгкий естественный макияж для дневных мероприятий. Подчёркиваю натуральную красоту с помощью профессиональной косметики.', hashtags = ARRAY['макияж', 'дневной', 'натуральный'], work_photos = '["/test/work-makeup-1.jpg"]'::jsonb WHERE id = 'c1368890-a84b-4956-9625-acecd075d499';
UPDATE services SET description = 'Яркий вечерний макияж для торжественных событий, вечеринок и фотосессий. Smoky eyes, контуринг, стойкое покрытие.', hashtags = ARRAY['макияж', 'вечерний', 'smoky'], work_photos = '["/test/work-makeup-1.jpg"]'::jsonb WHERE id = 'f6be8703-2529-4c39-aabf-172ac6e51017';
UPDATE services SET description = 'Профессиональный свадебный макияж с пробным визитом. Стойкий на весь день. Работаю с невестами более 8 лет.', hashtags = ARRAY['макияж', 'свадебный', 'невеста'], work_photos = '["/test/work-makeup-2.jpg"]'::jsonb WHERE id = 'e1d45339-b500-4c0f-b6b6-e1cf278d4143';

-- Елена Маникюрова services
UPDATE services SET description = 'Маникюр с покрытием гель-лаком. Аппаратная обработка, выравнивание ногтевой пластины, стойкое покрытие до 3 недель.', hashtags = ARRAY['маникюр', 'гель-лак', 'аппаратный'], work_photos = '["/test/work-nails-1.jpg"]'::jsonb WHERE id = 'a75abe24-1a0f-4e48-b76e-22257d27cb97';
UPDATE services SET description = 'Наращивание ногтей акрилом или полигелем. Любая форма и длина. Укрепление тонких ногтей.', hashtags = ARRAY['наращивание', 'акрил', 'полигель'], work_photos = '["/test/work-nails-2.jpg"]'::jsonb WHERE id = '2c304e87-8736-40ab-bbfc-57a0d4d02cf8';
UPDATE services SET description = 'Аппаратный педикюр с покрытием. Обработка стоп, удаление натоптышей, покрытие гель-лаком.', hashtags = ARRAY['педикюр', 'аппаратный', 'гель-лак'], work_photos = '["/test/work-nails-1.jpg"]'::jsonb WHERE id = 'd1e80f2c-c0bf-4aa6-925f-122c38edf5d7';

-- Дмитрий Силин services
UPDATE services SET description = 'Индивидуальная тренировка в зале с персональной программой. Коррекция техники, контроль нагрузки, мотивация.', hashtags = ARRAY['тренировка', 'персональная', 'зал'], work_photos = '["/test/work-fitness-1.jpg"]'::jsonb WHERE id = '20042562-df9e-494a-8acf-9933d96374ea';
UPDATE services SET description = 'Высокоинтенсивная тренировка кроссфит. Круговые тренировки, функциональные упражнения, работа с весом тела.', hashtags = ARRAY['кроссфит', 'функциональный', 'HIIT'], work_photos = '["/test/work-fitness-2.jpg"]'::jsonb WHERE id = '4d385d15-c025-4539-9c68-a9b764dfd5d7';
UPDATE services SET description = 'Комплексная программа снижения веса на 3 месяца: тренировки 3 раза в неделю + план питания + еженедельный контроль.', hashtags = ARRAY['похудение', 'программа', 'питание'], work_photos = '["/test/work-fitness-1.jpg"]'::jsonb WHERE id = '093810a5-f917-4e5c-87e1-b3862a877569';

-- Оксана Йогина services
UPDATE services SET description = 'Персональное занятие йогой с учётом вашего уровня и целей. Хатха, виньяса, инь-йога.', hashtags = ARRAY['йога', 'индивидуальная', 'хатха'], work_photos = '["/test/interior-yoga-1.jpg"]'::jsonb WHERE id = '8d0eedd6-2f98-4822-8637-36148ddf1c5a';
UPDATE services SET description = 'Групповое занятие пилатесом до 8 человек. Укрепление мышц кора, улучшение осанки, гибкость.', hashtags = ARRAY['пилатес', 'группа', 'осанка'], work_photos = '["/test/interior-yoga-1.jpg"]'::jsonb WHERE id = 'db353891-53a8-419c-a406-5e044d3b84ba';
UPDATE services SET description = 'Курс медитации из 8 занятий. Техники осознанности, дыхательные практики, работа со стрессом.', hashtags = ARRAY['медитация', 'осознанность', 'релакс'], work_photos = '["/test/interior-yoga-1.jpg"]'::jsonb WHERE id = '2b9df9bd-b596-444e-ab4f-118f4ca3ea54';

-- Игорь Числов services
UPDATE services SET description = 'Подготовка к ЕГЭ по математике. Разбор всех типов заданий, пробные тесты, стратегия сдачи. Средний балл учеников — 82.', hashtags = ARRAY['ЕГЭ', 'математика', 'подготовка'], work_photos = '["/test/work-teaching-1.jpg"]'::jsonb WHERE id = 'bd6af102-d94c-4940-a593-2513de2a38f3';
UPDATE services SET description = 'Подготовка к ОГЭ по математике для 9-классников. Алгебра и геометрия, решение типовых заданий.', hashtags = ARRAY['ОГЭ', 'математика', '9класс'], work_photos = '["/test/work-teaching-1.jpg"]'::jsonb WHERE id = 'aaa132d4-5283-4db2-a4aa-1f30d6e674a0';
UPDATE services SET description = 'Олимпиадная математика для школьников 7-11 класс. Нестандартные задачи, теория чисел, комбинаторика.', hashtags = ARRAY['олимпиада', 'математика', 'нестандартные'], work_photos = '["/test/work-teaching-1.jpg"]'::jsonb WHERE id = '3f3c611c-4b76-4149-98b6-080496568187';

-- Марина Языкова services
UPDATE services SET description = 'Курс разговорного английского. Снятие языкового барьера, расширение словарного запаса, живое общение.', hashtags = ARRAY['английский', 'разговорный', 'speaking'], work_photos = '["/test/work-teaching-2.jpg"]'::jsonb WHERE id = '66783128-051d-4814-a74d-f2616ffab7c6';
UPDATE services SET description = 'Комплексная подготовка к IELTS. Все модули: Listening, Reading, Writing, Speaking. Пробные тесты.', hashtags = ARRAY['IELTS', 'английский', 'экзамен'], work_photos = '["/test/work-teaching-2.jpg"]'::jsonb WHERE id = '444f17fd-281c-4a29-86f3-199b8c1ba877';
UPDATE services SET description = 'Деловой английский для профессионалов. Бизнес-лексика, переговоры, презентации, деловая переписка.', hashtags = ARRAY['деловой', 'английский', 'бизнес'], work_photos = '["/test/work-teaching-2.jpg"]'::jsonb WHERE id = '495c6b47-e7d3-4cc9-ae34-606ed302b1b2';

-- Алексей Фотов services
UPDATE services SET description = 'Портретная фотосессия в студии или на выезде. 1 час съёмки, 20 обработанных фото. Естественные и постановочные кадры.', hashtags = ARRAY['портрет', 'фотосессия', 'студия'], work_photos = '["/test/work-photo-2.jpg"]'::jsonb WHERE id = '7391cca1-374a-4a11-b6f1-398418614341';
UPDATE services SET description = 'Полный день свадебной съёмки. ЗАГС, прогулка, банкет. 300+ обработанных фото, слайд-шоу, фотокнига.', hashtags = ARRAY['свадьба', 'фотосъёмка', 'love-story'], work_photos = '["/test/work-photo-1.jpg"]'::jsonb WHERE id = '58d6cd7c-0284-4dc6-a475-360c7dc754b4';
UPDATE services SET description = 'Предметная съёмка для каталогов и маркетплейсов. Белый фон, lifestyle, 360°. До 30 товаров за сессию.', hashtags = ARRAY['предметная', 'каталог', 'товар'], work_photos = '["/test/work-photo-3.jpg"]'::jsonb WHERE id = 'd5c63cff-cccf-49fa-a6b2-d918c5d240e5';

-- Наталья Здоровцева services
UPDATE services SET description = 'Первичная консультация нутрициолога. Анализ текущего питания, определение целей, рекомендации.', hashtags = ARRAY['нутрициолог', 'консультация', 'питание'], work_photos = '["/test/work-nutrition-1.jpg"]'::jsonb WHERE id = '8cba71a8-2cb1-4f98-b10b-513673d93c97';
UPDATE services SET description = 'Индивидуальная программа питания на 4 недели с учётом целей, аллергий и предпочтений. Список продуктов и рецепты.', hashtags = ARRAY['программа', 'диета', 'рацион'], work_photos = '["/test/work-nutrition-1.jpg"]'::jsonb WHERE id = '9c6514b8-bac5-4247-a0e3-09542684d303';
UPDATE services SET description = 'Детокс-программа на 7 дней. Очищение организма, нормализация пищеварения, рекомендации по питанию.', hashtags = ARRAY['детокс', 'очищение', 'здоровье'], work_photos = '["/test/work-nutrition-1.jpg"]'::jsonb WHERE id = '6143a79d-ad6c-44c4-89aa-727689302df6';

-- Сергей Домов services
UPDATE services SET description = 'Вызов сантехника: устранение протечек, замена смесителей, установка раковин и унитазов, подключение стиральных машин.', hashtags = ARRAY['сантехник', 'протечка', 'установка'], work_photos = '["/test/work-home-2.jpg"]'::jsonb WHERE id = '5111c9ba-77b6-4835-b9f7-960b9ccff5d3';
UPDATE services SET description = 'Мелкий бытовой ремонт: навеска полок, сборка мебели, замена розеток, ремонт дверей и замков.', hashtags = ARRAY['ремонт', 'мебель', 'полки'], work_photos = '["/test/work-home-1.jpg"]'::jsonb WHERE id = '169a69dc-27ef-4c9c-8f96-7d1d7a6714a1';
UPDATE services SET description = 'Электромонтажные работы: замена проводки, установка розеток и выключателей, подключение светильников.', hashtags = ARRAY['электрик', 'проводка', 'розетки'], work_photos = '["/test/work-home-1.jpg"]'::jsonb WHERE id = '1c24a8b2-f69a-4c81-af11-7289940a6235';

-- Павел Моторов services
UPDATE services SET description = 'Компьютерная диагностика всех систем автомобиля. Считывание ошибок, проверка датчиков, рекомендации по ремонту.', hashtags = ARRAY['диагностика', 'авто', 'компьютерная'], work_photos = '["/test/work-auto-1.jpg"]'::jsonb WHERE id = '41a56805-07e7-4b3b-9dc3-9fdd1ed58d94';
UPDATE services SET description = 'Замена моторного масла и фильтров. Используем масла ведущих производителей. Экспресс-обслуживание за 30 минут.', hashtags = ARRAY['масло', 'фильтр', 'ТО'], work_photos = '["/test/work-auto-1.jpg"]'::jsonb WHERE id = 'd34827c2-1442-4169-b385-ff506d8b81f1';
UPDATE services SET description = 'Кузовной ремонт: рихтовка, покраска, устранение вмятин и царапин. Подбор краски по VIN-коду.', hashtags = ARRAY['кузовной', 'покраска', 'рихтовка'], work_photos = '["/test/work-auto-2.jpg"]'::jsonb WHERE id = 'a311e9ca-4bd1-40d3-9c4a-5a2961ddd58a';

-- Юлия Релаксова services
UPDATE services SET description = 'Процедура стоун-терапии горячими вулканическими камнями. Глубокое расслабление мышц, снятие стресса.', hashtags = ARRAY['стоун', 'камни', 'релакс'], work_photos = '["/test/work-spa-2.jpg"]'::jsonb WHERE id = '5be192e9-a93c-4954-b7a4-44b843b8ae07';
UPDATE services SET description = 'Обёртывание на основе натуральных компонентов: водоросли, шоколад, мёд. Увлажнение, детокс, похудение.', hashtags = ARRAY['обёртывание', 'детокс', 'тело'], work_photos = '["/test/work-spa-1.jpg"]'::jsonb WHERE id = 'e6cdb8ed-f4a9-4bc7-9212-995777fba740';
UPDATE services SET description = 'Ароматерапевтическая процедура с эфирными маслами. Расслабляющий массаж с аромакомпозицией на выбор.', hashtags = ARRAY['ароматерапия', 'масла', 'расслабление'], work_photos = '["/test/work-spa-1.jpg"]'::jsonb WHERE id = '7e0e07f1-bf97-44bc-85b0-e5767e271bfd';

-- Вера Массажова services
UPDATE services SET description = 'Классический общий массаж тела. Расслабление мышц, улучшение кровообращения, снятие напряжения. 60 минут блаженства.', hashtags = ARRAY['массаж', 'классический', 'расслабление'], work_photos = '["/test/work-spa-1.jpg"]'::jsonb WHERE id = 'c04aa59e-5364-4b06-9164-37dfdec24209';
UPDATE services SET description = 'Спортивный массаж для восстановления после тренировок. Глубокая проработка мышц, растяжка, снятие зажимов.', hashtags = ARRAY['массаж', 'спортивный', 'восстановление'], work_photos = '["/test/work-spa-2.jpg"]'::jsonb WHERE id = '2d9f49a9-f0ac-4b9f-8829-6def667d19d4';
UPDATE services SET description = 'Антицеллюлитный массаж проблемных зон. Курс из 10 процедур для видимого результата. Ручная техника + вакуум.', hashtags = ARRAY['антицеллюлитный', 'похудение', 'тело'], work_photos = '["/test/work-spa-1.jpg"]'::jsonb WHERE id = '123f4db1-87ad-4719-a4bb-f23f6877bd76';

-- BUSINESS LOCATIONS: update with photos and descriptions
UPDATE business_locations SET 
  description = 'Салон красоты полного цикла в центре Абакана. Маникюр, педикюр, стрижки, окрашивание, макияж. Уютная атмосфера, профессиональные мастера, качественная косметика. Работаем ежедневно с 9:00 до 21:00.',
  interior_photos = '["/test/interior-salon-1.jpg"]'::jsonb,
  exterior_photos = '["/test/exterior-salon-1.jpg"]'::jsonb,
  work_photos = '["/test/work-makeup-1.jpg", "/test/work-nails-1.jpg"]'::jsonb
WHERE id = '89021c2e-bf3a-42b1-98a5-6f99ea18c5bd';

UPDATE business_locations SET 
  description = 'Мужской барбершоп в стиле лофт. Стрижки, бритьё, уход за бородой. Атмосфера мужского клуба: виски, кофе, спортивные трансляции. Опытные барберы с авторскими техниками.',
  interior_photos = '["/test/interior-barber-1.jpg"]'::jsonb,
  exterior_photos = '["/test/exterior-salon-1.jpg"]'::jsonb,
  work_photos = '["/test/interior-barber-1.jpg"]'::jsonb
WHERE id = '4e9c3857-c843-4a2e-b881-59d2f388c527';

UPDATE business_locations SET 
  description = 'Студия йоги и пилатеса в уютном пространстве. Групповые и индивидуальные занятия, медитации, дыхательные практики. Профессиональные инструкторы, мягкое освещение, экологичные коврики.',
  interior_photos = '["/test/interior-yoga-1.jpg"]'::jsonb,
  exterior_photos = '["/test/exterior-salon-1.jpg"]'::jsonb,
  work_photos = '["/test/interior-yoga-1.jpg"]'::jsonb
WHERE id = 'b0000001-0003-0000-0000-000000000001';

UPDATE business_locations SET 
  description = 'Профессиональный автосервис. Диагностика, ТО, кузовной ремонт всех марок. Современное оборудование, оригинальные запчасти. Гарантия на все виды работ.',
  interior_photos = '["/test/interior-auto-1.jpg"]'::jsonb,
  exterior_photos = '["/test/work-auto-1.jpg"]'::jsonb,
  work_photos = '["/test/work-auto-1.jpg", "/test/work-auto-2.jpg"]'::jsonb
WHERE id = 'b0000001-0004-0000-0000-000000000001';

UPDATE business_locations SET 
  description = 'СПА-центр премиум-класса. Массажи, обёртывания, стоун-терапия, ароматерапия. Атмосфера полного расслабления. Натуральная косметика, опытные специалисты.',
  interior_photos = '["/test/interior-spa-center-1.jpg"]'::jsonb,
  exterior_photos = '["/test/exterior-salon-1.jpg"]'::jsonb,
  work_photos = '["/test/work-spa-1.jpg", "/test/work-spa-2.jpg"]'::jsonb
WHERE id = 'b0000001-0005-0000-0000-000000000001';

-- BUSINESS MASTERS: link masters to businesses
-- Анна Красавина + Елена Маникюрова → Салон красоты "Лаванда"
INSERT INTO business_masters (business_id, master_id, status, commission_percent, accepted_at) VALUES
  ('89021c2e-bf3a-42b1-98a5-6f99ea18c5bd', 'e0000001-0001-0000-0000-000000000001', 'accepted', 15, now()),
  ('89021c2e-bf3a-42b1-98a5-6f99ea18c5bd', 'e0000001-0002-0000-0000-000000000001', 'accepted', 15, now());

-- Оксана Йогина → Йога-студия "Лотос"
INSERT INTO business_masters (business_id, master_id, status, commission_percent, accepted_at) VALUES
  ('b0000001-0003-0000-0000-000000000001', 'e0000001-0004-0000-0000-000000000001', 'accepted', 10, now());

-- Павел Моторов → Автосервис "Мотор"
INSERT INTO business_masters (business_id, master_id, status, commission_percent, accepted_at) VALUES
  ('b0000001-0004-0000-0000-000000000001', 'e0000001-0010-0000-0000-000000000001', 'accepted', 20, now());

-- Юлия Релаксова + Вера Массажова → СПА-центр "Гармония"
INSERT INTO business_masters (business_id, master_id, status, commission_percent, accepted_at) VALUES
  ('b0000001-0005-0000-0000-000000000001', 'e0000001-0011-0000-0000-000000000001', 'accepted', 15, now()),
  ('b0000001-0005-0000-0000-000000000001', 'e0000001-0012-0000-0000-000000000001', 'accepted', 15, now());