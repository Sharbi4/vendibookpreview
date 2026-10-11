-- 1) Retire obsolete / duplicate email cron jobs -----------------------------

-- Stripe onboarding reminders: target edge function no longer exists (404 daily)
SELECT cron.unschedule('stripe-onboarding-reminder-daily');
SELECT cron.unschedule('send-stripe-onboarding-reminder-daily');

-- notify-expired-boosts scheduled twice (hourly + every 6h). Keep the 6h job.
SELECT cron.unschedule('notify-expired-boosts-hourly');

-- send-draft-reminder scheduled twice (hourly + every 2 days). Keep every-2-days.
SELECT cron.unschedule('send-draft-reminder-hourly');


-- 2) Scope the suppression list ---------------------------------------------
-- 'marketing'      -> newsletter/broadcast opt-out only; essential email still allowed
-- 'all'            -> hard bounce / spam complaint; block everything

ALTER TABLE public.suppressed_emails
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'all';

ALTER TABLE public.suppressed_emails
  DROP CONSTRAINT IF EXISTS suppressed_emails_scope_check;

ALTER TABLE public.suppressed_emails
  ADD CONSTRAINT suppressed_emails_scope_check
  CHECK (scope IN ('marketing', 'transactional', 'all'));

-- Backfill: newsletter/marketing opt-outs must not block essential email.
UPDATE public.suppressed_emails
SET scope = 'marketing'
WHERE lower(reason) IN ('unsubscribe', 'unsubscribed', 'marketing_unsubscribe', 'newsletter');

-- Bounces and complaints remain blocking for everything.
UPDATE public.suppressed_emails
SET scope = 'all'
WHERE lower(reason) IN ('bounce', 'bounced', 'complaint', 'complained', 'spam');

CREATE INDEX IF NOT EXISTS suppressed_emails_email_scope_idx
  ON public.suppressed_emails (lower(email), scope);