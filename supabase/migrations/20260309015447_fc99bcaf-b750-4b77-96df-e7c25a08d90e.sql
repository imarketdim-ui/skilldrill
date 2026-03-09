-- Schedule hourly recalculation of user scores
SELECT cron.schedule(
  'recalculate-user-scores-hourly',
  '0 * * * *', -- every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://fttbwjuaaltomksuslyi.supabase.co/functions/v1/recalculate-ratings',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dGJ3anVhYWx0b21rc3VzbHlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NjU4ODIsImV4cCI6MjA4NTA0MTg4Mn0.HSTrDQgTwr3m0NBX6j2qtPNDCLa_KhUyLHsj1fQWPso"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);