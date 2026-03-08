-- Update existing business location to auto detailing in Abakan
UPDATE business_locations 
SET 
  name = 'ООО "АвтоБлеск Детейлинг"',
  description = 'Профессиональный автодетейлинг-центр в Абакане. Полировка кузова, керамическое покрытие, защитные плёнки PPF, химчистка салона, нанокерамика. Работаем с любыми марками автомобилей. Сертифицированные мастера, премиальные материалы Koch Chemie, Gyeon, Ceramic Pro.',
  city = 'Абакан',
  address = 'ул. Пушкина, 118, Абакан, Республика Хакасия, 655017',
  director_name = 'Арзасов Василий Сергеевич',
  contact_email = 'avtosblesk.abakan@mail.ru',
  contact_phone = '+79617440008',
  inn = '190112345678',
  legal_form = 'ooo',
  category_id = 'a0000001-0000-0000-0000-000000000002',
  hashtags = ARRAY['автодетейлинг', 'полировка', 'керамика', 'PPF', 'химчистка', 'нанопокрытие', 'абакан', 'хакасия'],
  latitude = 53.7162619,
  longitude = 91.4310239,
  moderation_status = 'approved',
  subscription_status = 'trial',
  updated_at = now()
WHERE id = '3de05212-6e20-47a3-ab71-e5f627338792';

-- Update profile phone
UPDATE profiles 
SET phone = '+79617440008'
WHERE id = '9529ffcd-18f8-4242-bf44-6373cf2ee312' AND phone IS NULL;
