DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'marketplace-digest-every-2-days') THEN
    PERFORM cron.unschedule('marketplace-digest-every-2-days');
  END IF;
END $$;

SELECT cron.schedule(
  'marketplace-digest-every-2-days',
  '0 14 */2 * *',
  $$
  SELECT net.http_post(
    url := 'https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/send-marketplace-digest',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5icmVoYndmc21lZGJlbHpudHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDgzMTMsImV4cCI6MjA4MzY4NDMxM30.EkA-lGUmkLQ9rPAO-unLxGGGHVmPDdVR8awlA2ShVpU"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);