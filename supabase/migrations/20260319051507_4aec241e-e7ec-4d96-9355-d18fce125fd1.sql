-- Add per-cabinet avatar to master_profiles
ALTER TABLE public.master_profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Ensure user_scores_public view is correct and complete
DROP VIEW IF EXISTS public.user_scores_public;
CREATE VIEW public.user_scores_public AS
  SELECT 
    user_id,
    total_score,
    status,
    completed_visits,
    no_show_count,
    cancel_under_1h,
    cancel_under_3h,
    total_cancellations,
    vip_by_count,
    blacklist_by_count,
    account_age_days,
    last_calculated_at
  FROM public.user_scores;

GRANT SELECT ON public.user_scores_public TO authenticated;

-- Add index for cabinet scoped chat queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_cabinet_scope 
  ON public.chat_messages(cabinet_type_scope, sender_id, recipient_id);

-- Add index for cabinet-scoped notifications
CREATE INDEX IF NOT EXISTS idx_notifications_cabinet_type
  ON public.notifications(user_id, cabinet_type);

-- Add index for cabinet_balances
CREATE INDEX IF NOT EXISTS idx_cabinet_balances_lookup
  ON public.cabinet_balances(user_id, cabinet_type, cabinet_id);

-- Ensure cabinet_balances has RLS
ALTER TABLE public.cabinet_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own cabinet balances" ON public.cabinet_balances;
DROP POLICY IF EXISTS "Users can insert own cabinet balances" ON public.cabinet_balances;
DROP POLICY IF EXISTS "Users can update own cabinet balances" ON public.cabinet_balances;

CREATE POLICY "Users can view own cabinet balances" ON public.cabinet_balances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cabinet balances" ON public.cabinet_balances
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cabinet balances" ON public.cabinet_balances
  FOR UPDATE USING (auth.uid() = user_id);

-- Ensure cabinet_transfers has RLS
ALTER TABLE public.cabinet_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own cabinet transfers" ON public.cabinet_transfers;
DROP POLICY IF EXISTS "Users can insert own cabinet transfers" ON public.cabinet_transfers;

CREATE POLICY "Users can view own cabinet transfers" ON public.cabinet_transfers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cabinet transfers" ON public.cabinet_transfers
  FOR INSERT WITH CHECK (auth.uid() = user_id);