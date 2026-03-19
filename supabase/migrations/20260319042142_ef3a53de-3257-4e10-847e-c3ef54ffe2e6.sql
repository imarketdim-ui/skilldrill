-- Fix: ensure user_scores_public is NOT security definer (it's already a regular view, but re-create to be explicit)
DROP VIEW IF EXISTS public.user_scores_public;

CREATE VIEW public.user_scores_public
WITH (security_invoker = true)
AS
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

-- Grant access so the view is queryable via anon/authenticated roles
GRANT SELECT ON public.user_scores_public TO authenticated;
GRANT SELECT ON public.user_scores_public TO anon;