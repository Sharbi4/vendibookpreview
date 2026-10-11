DO $$
BEGIN
  PERFORM cron.unschedule('signnow-agreement-sweep');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'signnow-agreement-sweep',
  '17 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/signnow-agreement-sweep',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5icmVoYndmc21lZGJlbHpudHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDgzMTMsImV4cCI6MjA4MzY4NDMxM30.EkA-lGUmkLQ9rPAO-unLxGGGHVmPDdVR8awlA2ShVpU'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);