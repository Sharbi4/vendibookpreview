
SELECT cron.unschedule('send-feedback-requests') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-feedback-requests');

SELECT cron.schedule(
  'send-feedback-requests',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url := 'https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/send-feedback-requests',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5icmVoYndmc21lZGJlbHpudHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDgzMTMsImV4cCI6MjA4MzY4NDMxM30.EkA-lGUmkLQ9rPAO-unLxGGGHVmPDdVR8awlA2ShVpU"}'::jsonb,
    body := jsonb_build_object('scheduled_at', now())
  ) AS request_id;
  $$
);
