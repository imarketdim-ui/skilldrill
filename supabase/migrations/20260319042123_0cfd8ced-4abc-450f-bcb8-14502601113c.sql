-- ============================================================
-- PHASE 1: Cabinet Isolation Infrastructure
-- ============================================================

-- 1. Add telegram and privacy_settings columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS telegram TEXT,
  ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{}'::jsonb;

-- 2. Add cabinet_type to notifications
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS cabinet_type TEXT DEFAULT 'client';

CREATE INDEX IF NOT EXISTS idx_notifications_cabinet ON public.notifications(user_id, cabinet_type);

-- 3. Add cabinet_type to chat_messages
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS cabinet_type_scope TEXT DEFAULT 'client';

-- 4. Add cabinet_type to balance_transactions
ALTER TABLE public.balance_transactions
  ADD COLUMN IF NOT EXISTS cabinet_type TEXT DEFAULT 'client',
  ADD COLUMN IF NOT EXISTS cabinet_id UUID;

CREATE INDEX IF NOT EXISTS idx_balance_tx_cabinet ON public.balance_transactions(user_id, cabinet_type);

-- 5. Create cabinet_balances table (separate ledger per cabinet)
CREATE TABLE IF NOT EXISTS public.cabinet_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cabinet_type TEXT NOT NULL CHECK (cabinet_type IN ('client', 'master', 'business', 'platform')),
  cabinet_id UUID,
  main_balance NUMERIC NOT NULL DEFAULT 0,
  bonus_balance NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, cabinet_type, cabinet_id)
);

ALTER TABLE public.cabinet_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own cabinet balances" ON public.cabinet_balances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own cabinet balances" ON public.cabinet_balances
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own cabinet balances" ON public.cabinet_balances
  FOR UPDATE USING (auth.uid() = user_id);

-- 6. Create cabinet_transfers table
CREATE TABLE IF NOT EXISTS public.cabinet_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_cabinet_type TEXT NOT NULL,
  from_cabinet_id UUID,
  to_cabinet_type TEXT NOT NULL,
  to_cabinet_id UUID,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cabinet_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own cabinet transfers" ON public.cabinet_transfers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users create own cabinet transfers" ON public.cabinet_transfers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 7. Seed cabinet_balances for existing users from user_balances
INSERT INTO public.cabinet_balances (user_id, cabinet_type, main_balance)
SELECT user_id, 'client', COALESCE(main_balance, 0)
FROM public.user_balances
ON CONFLICT (user_id, cabinet_type, cabinet_id) DO NOTHING;

-- 8. Create/replace user_scores_public view with all columns ClientStats needs
DROP VIEW IF EXISTS public.user_scores_public;

CREATE VIEW public.user_scores_public AS
SELECT
  us.user_id,
  us.total_score,
  us.status,
  us.completed_visits,
  us.no_show_count,
  us.cancel_under_1h,
  us.cancel_under_3h,
  us.total_cancellations,
  us.vip_by_count,
  us.blacklist_by_count,
  us.account_age_days,
  us.last_calculated_at
FROM public.user_scores us;

-- 9. Helper function to check score view access
CREATE OR REPLACE FUNCTION public.can_view_user_score(_viewer uuid, _target uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _viewer = _target
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _viewer AND role IN ('master', 'business_owner', 'platform_admin', 'super_admin') AND is_active = true
    );
$$;

-- 10. Trigger: auto-create client cabinet_balance on new user
CREATE OR REPLACE FUNCTION public.create_cabinet_balance_on_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.cabinet_balances (user_id, cabinet_type, main_balance)
  VALUES (NEW.id, 'client', 0)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_profile_create_cabinet_balance ON public.profiles;
CREATE TRIGGER on_new_profile_create_cabinet_balance
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_cabinet_balance_on_new_user();

-- 11. Create master cabinet_balance on master_profile creation
CREATE OR REPLACE FUNCTION public.create_master_cabinet_balance()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.cabinet_balances (user_id, cabinet_type, cabinet_id, main_balance)
  VALUES (NEW.user_id, 'master', NEW.id, 0)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_master_profile_create_cabinet_balance ON public.master_profiles;
CREATE TRIGGER on_master_profile_create_cabinet_balance
  AFTER INSERT ON public.master_profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_master_cabinet_balance();

-- 12. Create business cabinet_balance on business_location creation
CREATE OR REPLACE FUNCTION public.create_business_cabinet_balance()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.cabinet_balances (user_id, cabinet_type, cabinet_id, main_balance)
  VALUES (NEW.owner_id, 'business', NEW.id, 0)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_business_location_create_cabinet_balance ON public.business_locations;
CREATE TRIGGER on_business_location_create_cabinet_balance
  AFTER INSERT ON public.business_locations
  FOR EACH ROW EXECUTE FUNCTION public.create_business_cabinet_balance();

-- 13. Seed master cabinet balances from existing master_profiles
INSERT INTO public.cabinet_balances (user_id, cabinet_type, cabinet_id, main_balance)
SELECT user_id, 'master', id, 0
FROM public.master_profiles
ON CONFLICT DO NOTHING;

-- 14. Seed business cabinet balances from existing business_locations
INSERT INTO public.cabinet_balances (user_id, cabinet_type, cabinet_id, main_balance)
SELECT owner_id, 'business', id, 0
FROM public.business_locations
ON CONFLICT DO NOTHING;