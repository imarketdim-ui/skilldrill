
-- Populate missing city from address for master_profiles
UPDATE public.master_profiles SET city = 'Красноярск' WHERE city IS NULL AND address ILIKE '%Красноярск%';
UPDATE public.master_profiles SET city = 'Москва' WHERE city IS NULL AND address ILIKE '%Москва%';
-- Catch-all: extract city from "г. <City>," pattern for remaining nulls
UPDATE public.master_profiles SET city = 'Красноярск' WHERE city IS NULL AND address IS NOT NULL AND address ILIKE '%красноярск%';
UPDATE public.master_profiles SET city = 'Москва' WHERE city IS NULL AND address IS NOT NULL AND address ILIKE '%москв%';
