
-- Rate limits table for sliding-window rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limits_user_action ON public.rate_limits (user_id, action, created_at DESC);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role accesses this table (via edge function)
-- No RLS policies needed for anon/authenticated

-- Auto-cleanup: delete entries older than 1 day to keep table small
-- (will be handled by a cron job)

-- Enable pg_cron and pg_net for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
