
-- Bonus points / loyalty system
CREATE TABLE public.bonus_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  total_earned integer NOT NULL DEFAULT 0,
  total_spent integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE public.bonus_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  type text NOT NULL, -- 'earn', 'spend', 'expire', 'admin_adjust'
  source text NOT NULL, -- 'booking_complete', 'referral', 'promo', 'review', 'purchase', 'admin'
  description text,
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bonus_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonus_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own bonus points" ON public.bonus_points
  FOR SELECT USING (user_id = auth.uid() OR is_platform_admin(auth.uid()));

CREATE POLICY "System manages bonus points" ON public.bonus_points
  FOR ALL USING (user_id = auth.uid() OR is_platform_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR is_platform_admin(auth.uid()));

CREATE POLICY "Users view own bonus transactions" ON public.bonus_transactions
  FOR SELECT USING (user_id = auth.uid() OR is_platform_admin(auth.uid()));

CREATE POLICY "System creates bonus transactions" ON public.bonus_transactions
  FOR INSERT WITH CHECK (user_id = auth.uid() OR is_platform_admin(auth.uid()));

-- Auto-create bonus_points row for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.bonus_points (user_id, balance, total_earned, total_spent)
  VALUES (NEW.id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_bonus
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_bonus();
