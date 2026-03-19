-- Recreate user_scores_public view with SECURITY INVOKER to fix security definer issue
DROP VIEW IF EXISTS public.user_scores_public;
CREATE VIEW public.user_scores_public 
  WITH (security_invoker = true)
AS
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