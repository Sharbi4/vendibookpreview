-- Schedule booking abandonment recovery emails (2h + 24h cadence)
-- The edge function exists and the booking_drafts table is populated by the wizard,
-- but no cron job was scheduling it. Run every 30 minutes.

DO $$
BEGIN
  -- Remove any prior schedule with the same name to keep this migration idempotent
  PERFORM cron.unschedule('send-booking-abandonment-emails');
EXCEPTION WHEN OTHERS THEN
  -- ignore if it didn't exist
  NULL;
END $$;

SELECT cron.schedule(
  'send-booking-abandonment-emails',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/send-booking-abandonment-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5icmVoYndmc21lZGJlbHpudHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDgzMTMsImV4cCI6MjA4MzY4NDMxM30.EkA-lGUmkLQ9rPAO-unLxGGGHVmPDdVR8awlA2ShVpU'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);