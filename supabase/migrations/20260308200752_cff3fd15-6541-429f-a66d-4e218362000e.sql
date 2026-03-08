
-- Fix security definer view - use SECURITY INVOKER instead
DROP VIEW IF EXISTS public.user_scores_master_view;

CREATE VIEW public.user_scores_master_view
WITH (security_invoker = true)
AS
SELECT 
  user_id,
  total_score,
  profile_score,
  activity_score,
  completed_visits,
  no_show_count,
  cancel_under_1h,
  cancel_under_3h,
  total_cancellations,
  disputes_total,
  disputes_won,
  disputes_lost,
  vip_by_count,
  blacklist_by_count,
  unique_partners,
  top_partner_pct,
  has_full_name,
  has_photo,
  kyc_verified,
  status,
  account_age_days,
  last_calculated_at
FROM public.user_scores;
