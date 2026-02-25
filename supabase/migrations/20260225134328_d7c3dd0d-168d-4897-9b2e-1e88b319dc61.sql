
-- Update existing master profiles with coordinates
UPDATE master_profiles 
SET latitude = 53.7151, longitude = 91.4292, address = 'ул. Пушкина, 15, Абакан',
    hashtags = ARRAY['стрижка','укладка','барбер']
WHERE id = 'b08fd0a2-96d8-428e-971b-913365c46595';

-- Activate the second master
UPDATE master_profiles 
SET is_active = true, latitude = 53.7200, longitude = 91.4350, address = 'ул. Ленина, 42, Абакан',
    hashtags = ARRAY['маникюр','педикюр','гель-лак']
WHERE id = 'a4e33edf-6088-47b0-96eb-73ff5e0d76ba';

-- Add more services to the existing masters
INSERT INTO services (master_id, name, description, price, duration_minutes, is_active) VALUES
('07ffeae2-b9c7-4e0c-b3f7-9f4d47f9031c', 'Мужская стрижка', 'Модельная мужская стрижка', 800, 30, true),
('07ffeae2-b9c7-4e0c-b3f7-9f4d47f9031c', 'Укладка', 'Укладка волос', 500, 20, true),
('192febfd-59dd-452d-be94-31addb67dec3', 'Маникюр классический', 'Классический маникюр', 1000, 60, true),
('192febfd-59dd-452d-be94-31addb67dec3', 'Педикюр', 'Педикюр с покрытием', 1500, 90, true);

-- Update profile with proper name
UPDATE profiles SET first_name = 'Алина', last_name = 'Мирова' WHERE id = '192febfd-59dd-452d-be94-31addb67dec3' AND (first_name IS NULL OR first_name = '');

-- Create demo business locations owned by existing users
INSERT INTO business_locations (owner_id, name, inn, legal_form, description, address, latitude, longitude, is_active, moderation_status, subscription_status, trial_start_date, contact_phone, contact_email, hashtags, free_masters, extra_master_price, subscription_price) VALUES
('1e1eaa49-0826-48e5-95be-06f8b2c56502', 'Салон красоты "Лаванда"', '1901000001', 'ip', 'Салон красоты полного цикла. Маникюр, педикюр, стрижки, окрашивание.', 'ул. Пушкина, 15, Абакан', 53.7155, 91.4295, true, 'approved', 'trial', now(), '+79001112233', 'lavanda@demo.test', ARRAY['салон красоты','маникюр','стрижки'], 5, 500, 2500),
('07ffeae2-b9c7-4e0c-b3f7-9f4d47f9031c', 'Барбершоп "Стиль"', '1901000002', 'ip', 'Мужские стрижки и уход. Барбершоп в центре Абакана.', 'ул. Ленина, 42, Абакан', 53.7200, 91.4350, true, 'approved', 'trial', now(), '+79003334455', 'style@demo.test', ARRAY['барбершоп','мужские стрижки','борода'], 5, 500, 2500);

-- Create user_scores for the existing users
INSERT INTO user_scores (user_id, total_score, profile_score, activity_score, risk_score, reputation_score, completed_visits, no_show_count, cancel_under_1h, cancel_under_3h, total_cancellations, disputes_total, disputes_won, disputes_lost, vip_by_count, blacklist_by_count, unique_partners, has_full_name, has_photo, status, account_age_days, last_calculated_at) VALUES
('1e1eaa49-0826-48e5-95be-06f8b2c56502', 72, 15, 20, 22, 15, 8, 1, 0, 1, 2, 1, 1, 0, 2, 0, 3, true, false, 'active', 30, now()),
('07ffeae2-b9c7-4e0c-b3f7-9f4d47f9031c', 85, 20, 25, 25, 15, 15, 0, 0, 0, 0, 0, 0, 0, 5, 0, 4, true, false, 'active', 45, now()),
('192febfd-59dd-452d-be94-31addb67dec3', 45, 10, 10, 15, 10, 3, 2, 1, 1, 3, 0, 0, 0, 0, 1, 2, false, false, 'flagged', 15, now())
ON CONFLICT (user_id) DO UPDATE SET total_score = EXCLUDED.total_score, profile_score = EXCLUDED.profile_score, activity_score = EXCLUDED.activity_score, risk_score = EXCLUDED.risk_score, reputation_score = EXCLUDED.reputation_score, completed_visits = EXCLUDED.completed_visits, no_show_count = EXCLUDED.no_show_count, cancel_under_1h = EXCLUDED.cancel_under_1h, total_cancellations = EXCLUDED.total_cancellations, status = EXCLUDED.status, last_calculated_at = now();
