
-- Таблица причин аннулирования (управляется супер админом)
CREATE TABLE public.revocation_reasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.revocation_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active reasons" ON public.revocation_reasons
  FOR SELECT USING (is_active = true OR is_platform_admin(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Super admins manage reasons" ON public.revocation_reasons
  FOR ALL USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- Seed default reasons
INSERT INTO public.revocation_reasons (name, description) VALUES
  ('Нарушение правил площадки', 'Систематическое нарушение правил использования платформы'),
  ('Спам', 'Рассылка спама или нежелательных сообщений'),
  ('Мошенничество', 'Обман клиентов или платформы'),
  ('Некачественные услуги', 'Систематические жалобы на качество услуг'),
  ('Неактивность', 'Длительное отсутствие активности на платформе'),
  ('Нарушение законодательства', 'Деятельность, нарушающая законодательство РФ'),
  ('Фейковый аккаунт', 'Использование поддельных данных при регистрации'),
  ('Оскорбительное поведение', 'Грубость и оскорбления в адрес клиентов или коллег');

-- Таблица заявок на аннулирование
CREATE TABLE public.revocation_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id UUID NOT NULL REFERENCES public.profiles(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('master', 'business', 'network')),
  target_entity_id UUID, -- master_profile id, business_location id, or network id
  reason_id UUID NOT NULL REFERENCES public.revocation_reasons(id),
  description TEXT,
  requested_by UUID NOT NULL REFERENCES public.profiles(id),
  reviewed_by UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at TIMESTAMPTZ,
  review_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.revocation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins create revocation requests" ON public.revocation_requests
  FOR INSERT WITH CHECK (is_platform_admin(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Admins and super admins view requests" ON public.revocation_requests
  FOR SELECT USING (is_platform_admin(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Super admins update requests" ON public.revocation_requests
  FOR UPDATE USING (is_super_admin(auth.uid()));

-- Таблица архива аннулированных
CREATE TABLE public.revocation_archive (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  entity_type TEXT NOT NULL,
  entity_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  revocation_request_id UUID REFERENCES public.revocation_requests(id),
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  restored_at TIMESTAMPTZ,
  restored_by UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.revocation_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage archive" ON public.revocation_archive
  FOR ALL USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Admins view archive" ON public.revocation_archive
  FOR SELECT USING (is_platform_admin(auth.uid()));
