
SELECT cron.schedule(
  'auto-complete-bookings',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url:='https://fttbwjuaaltomksuslyi.supabase.co/functions/v1/auto-complete-bookings',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dGJ3anVhYWx0b21rc3VzbHlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NjU4ODIsImV4cCI6MjA4NTA0MTg4Mn0.HSTrDQgTwr3m0NBX6j2qtPNDCLa_KhUyLHsj1fQWPso"}'::jsonb,
    body:='{"time": "now"}'::jsonb
  ) as request_id;
  $$
);

SELECT cron.schedule(
  'cleanup-rate-limits',
  '0 * * * *',
  $$DELETE FROM public.rate_limits WHERE created_at < now() - interval '1 day';$$
);
