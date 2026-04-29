ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS crm jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS erp jsonb DEFAULT '{}'::jsonb;
