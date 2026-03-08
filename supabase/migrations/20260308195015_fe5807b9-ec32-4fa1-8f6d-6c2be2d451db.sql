
-- Fix security definer view by using SECURITY INVOKER (default, just recreate without security definer)
DROP VIEW IF EXISTS public.user_scores_public;
CREATE VIEW public.user_scores_public WITH (security_invoker = on) AS
SELECT 
  user_id,
  completed_visits,
  no_show_count,
  cancel_under_1h,
  cancel_under_3h,
  total_cancellations,
  vip_by_count,
  blacklist_by_count,
  account_age_days,
  status,
  CASE 
    WHEN status = 'insufficient_data' THEN 'insufficient_data'
    WHEN total_score >= 70 THEN 'good'
    WHEN total_score >= 50 THEN 'moderate'
    WHEN total_score >= 40 THEN 'warning'
    ELSE 'restricted'
  END as score_level
FROM public.user_scores;
