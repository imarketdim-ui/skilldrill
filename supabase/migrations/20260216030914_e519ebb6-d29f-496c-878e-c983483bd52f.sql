
-- Fix existing master profile with missing category_id
UPDATE master_profiles 
SET category_id = (
  SELECT category_id FROM role_requests 
  WHERE requester_id = master_profiles.user_id 
  AND status = 'approved' 
  AND category_id IS NOT NULL 
  ORDER BY reviewed_at DESC 
  LIMIT 1
)
WHERE category_id IS NULL;

-- Add trial_start_date where missing
UPDATE master_profiles 
SET trial_start_date = created_at,
    subscription_status = 'trial'
WHERE trial_start_date IS NULL AND subscription_status = 'trial';

-- Create a trigger to give new users 10,000 test rubles on registration
CREATE OR REPLACE FUNCTION public.create_user_balance()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_balances (user_id, main_balance, referral_balance)
  VALUES (NEW.id, 10000, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_profile_created_balance ON public.profiles;

-- Create trigger on profiles table
CREATE TRIGGER on_profile_created_balance
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_balance();

-- Give existing users 10,000 test rubles if they don't have a balance yet
INSERT INTO user_balances (user_id, main_balance, referral_balance)
SELECT id, 10000, 0 FROM profiles
WHERE id NOT IN (SELECT user_id FROM user_balances)
ON CONFLICT (user_id) DO UPDATE SET main_balance = 10000;

-- Update existing users with 0 balance to 10000
UPDATE user_balances SET main_balance = 10000 WHERE main_balance = 0;
