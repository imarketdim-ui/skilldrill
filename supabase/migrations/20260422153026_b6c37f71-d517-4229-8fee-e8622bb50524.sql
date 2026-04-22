-- ============ Фаза 1: ALTER существующих таблиц ============

-- profiles: birthday, gender, telegram_chat_id (referred_by уже есть)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birthday DATE,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- business_locations: priority_for_user_id, onboarding_status
ALTER TABLE public.business_locations
  ADD COLUMN IF NOT EXISTS priority_for_user_id UUID,
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT NOT NULL DEFAULT 'in_progress';

-- networks
ALTER TABLE public.networks
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT NOT NULL DEFAULT 'in_progress';

-- master_profiles
ALTER TABLE public.master_profiles
  ADD COLUMN IF NOT EXISTS priority_for_user_id UUID;

-- services: связь с тех.картой
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS technology_card_id UUID;

-- bookings: payment_status, deposit_amount
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_status TEXT,
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC DEFAULT 0;

-- chat_messages: расширение для медиа/ответов
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS audio_url TEXT,
  ADD COLUMN IF NOT EXISTS media_urls TEXT[],
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL;

-- ============ ENUM app_role: business_admin ============
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'business_admin'
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'business_admin';
  END IF;
END $$;

-- ============ Новые таблицы ============

-- 1. salary_schemes — схемы зарплат
CREATE TABLE IF NOT EXISTS public.salary_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.business_locations(id) ON DELETE CASCADE,
  master_id UUID NOT NULL,
  scheme_type TEXT NOT NULL DEFAULT 'percent', -- fixed | percent | mixed | piecework
  fixed_amount NUMERIC DEFAULT 0,
  percent_value NUMERIC DEFAULT 0,
  deduct_materials BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.salary_schemes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and managers manage salary schemes" ON public.salary_schemes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM business_locations WHERE id = salary_schemes.business_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM business_managers WHERE business_id = salary_schemes.business_id AND user_id = auth.uid() AND is_active = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM business_locations WHERE id = salary_schemes.business_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM business_managers WHERE business_id = salary_schemes.business_id AND user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Master can view own salary scheme" ON public.salary_schemes
  FOR SELECT USING (master_id = auth.uid());

-- 2. salary_records — история выплат
CREATE TABLE IF NOT EXISTS public.salary_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.business_locations(id) ON DELETE CASCADE,
  master_id UUID NOT NULL,
  scheme_id UUID REFERENCES public.salary_schemes(id) ON DELETE SET NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  bookings_count INTEGER NOT NULL DEFAULT 0,
  gross_amount NUMERIC NOT NULL DEFAULT 0,
  materials_cost NUMERIC NOT NULL DEFAULT 0,
  penalties_amount NUMERIC NOT NULL DEFAULT 0,
  net_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | paid
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and managers manage salary records" ON public.salary_records
  FOR ALL USING (
    EXISTS (SELECT 1 FROM business_locations WHERE id = salary_records.business_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM business_managers WHERE business_id = salary_records.business_id AND user_id = auth.uid() AND is_active = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM business_locations WHERE id = salary_records.business_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM business_managers WHERE business_id = salary_records.business_id AND user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Master can view own salary records" ON public.salary_records
  FOR SELECT USING (master_id = auth.uid());

-- 3. broadcasts — рассылки
CREATE TABLE IF NOT EXISTS public.broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.business_locations(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  audience_mode TEXT NOT NULL DEFAULT 'own', -- own | platform
  segment TEXT, -- new | regular | vip | sleeping | all
  cost_per_recipient NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  recipients_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | scheduled | sending | sent | failed
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and managers manage broadcasts" ON public.broadcasts
  FOR ALL USING (
    creator_id = auth.uid()
    OR (business_id IS NOT NULL AND (
      EXISTS (SELECT 1 FROM business_locations WHERE id = broadcasts.business_id AND owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM business_managers WHERE business_id = broadcasts.business_id AND user_id = auth.uid() AND is_active = true)
    ))
  )
  WITH CHECK (creator_id = auth.uid());

-- 4. broadcast_deliveries — доставки конкретным получателям
CREATE TABLE IF NOT EXISTS public.broadcast_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | delivered | failed | skipped_blacklist
  error TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.broadcast_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creator views deliveries" ON public.broadcast_deliveries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM broadcasts b WHERE b.id = broadcast_deliveries.broadcast_id AND b.creator_id = auth.uid())
  );

CREATE POLICY "Recipient views own deliveries" ON public.broadcast_deliveries
  FOR SELECT USING (recipient_id = auth.uid());

-- 5. loyalty_programs — программы лояльности
CREATE TABLE IF NOT EXISTS public.loyalty_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.business_locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  program_type TEXT NOT NULL DEFAULT 'cashback', -- cashback | points | discount | subscription
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active loyalty programs" ON public.loyalty_programs
  FOR SELECT USING (is_active = true);

CREATE POLICY "Owners and managers manage loyalty programs" ON public.loyalty_programs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM business_locations WHERE id = loyalty_programs.business_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM business_managers WHERE business_id = loyalty_programs.business_id AND user_id = auth.uid() AND is_active = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM business_locations WHERE id = loyalty_programs.business_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM business_managers WHERE business_id = loyalty_programs.business_id AND user_id = auth.uid() AND is_active = true)
  );

-- 6. loyalty_memberships — участие клиентов
CREATE TABLE IF NOT EXISTS public.loyalty_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0,
  total_earned NUMERIC NOT NULL DEFAULT 0,
  total_spent NUMERIC NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (program_id, client_id)
);
ALTER TABLE public.loyalty_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients view own memberships" ON public.loyalty_memberships
  FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Business manages memberships" ON public.loyalty_memberships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM loyalty_programs lp
      JOIN business_locations bl ON bl.id = lp.business_id
      WHERE lp.id = loyalty_memberships.program_id AND bl.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loyalty_programs lp
      JOIN business_locations bl ON bl.id = lp.business_id
      WHERE lp.id = loyalty_memberships.program_id AND bl.owner_id = auth.uid()
    )
  );

-- 7. typing_indicators — индикаторы набора текста (TTL 5 сек)
CREATE TABLE IF NOT EXISTS public.typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  chat_type TEXT NOT NULL DEFAULT 'direct',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 seconds'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, recipient_id, chat_type)
);
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own typing" ON public.typing_indicators
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Recipients see typing about them" ON public.typing_indicators
  FOR SELECT USING (recipient_id = auth.uid() OR user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_typing_indicators_recipient ON public.typing_indicators(recipient_id, expires_at);

-- 8. user_report_flags — жалобы на пользователей
CREATE TABLE IF NOT EXISTS public.user_report_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL,
  reported_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- open | reviewed | dismissed | confirmed
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_report_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create reports" ON public.user_report_flags
  FOR INSERT WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Reporters view own reports" ON public.user_report_flags
  FOR SELECT USING (reporter_id = auth.uid());

CREATE POLICY "Admins manage reports" ON public.user_report_flags
  FOR ALL USING (
    public.has_role(auth.uid(), 'platform_admin') OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'platform_admin') OR public.has_role(auth.uid(), 'super_admin')
  );

-- ============ Триггеры updated_at ============
CREATE TRIGGER trg_salary_schemes_updated_at BEFORE UPDATE ON public.salary_schemes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_broadcasts_updated_at BEFORE UPDATE ON public.broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_loyalty_programs_updated_at BEFORE UPDATE ON public.loyalty_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_loyalty_memberships_updated_at BEFORE UPDATE ON public.loyalty_memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Storage bucket для медиа в чате ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read chat media" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-media');

CREATE POLICY "Authenticated upload to own folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "User updates own chat media" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "User deletes own chat media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============ Обновляем платформенные цены ============
INSERT INTO public.platform_settings (key, value)
VALUES ('pricing', '{"master": 199, "business": 2490, "network": 5490}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();