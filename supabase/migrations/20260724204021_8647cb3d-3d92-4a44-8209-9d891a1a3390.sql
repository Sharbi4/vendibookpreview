-- 1) Webhook namespacing: allow both endpoints to record the same Stripe event id.
ALTER TABLE public.stripe_webhook_events
  ADD COLUMN IF NOT EXISTS endpoint TEXT NOT NULL DEFAULT 'stripe-webhook';

-- Drop old single-column uniqueness (constraint name from the original CREATE TABLE)
DO $$
DECLARE cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.stripe_webhook_events'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) ILIKE '%stripe_event_id%'
    AND pg_get_constraintdef(oid) NOT ILIKE '%endpoint%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.stripe_webhook_events DROP CONSTRAINT %I', cname);
  END IF;
END $$;

-- Add the namespaced unique constraint (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.stripe_webhook_events'::regclass
      AND conname = 'stripe_webhook_events_endpoint_event_uk'
  ) THEN
    ALTER TABLE public.stripe_webhook_events
      ADD CONSTRAINT stripe_webhook_events_endpoint_event_uk
      UNIQUE (endpoint, stripe_event_id);
  END IF;
END $$;

-- 2) Repair expired Featured Boosts still flagged enabled
UPDATE public.listings
SET featured_enabled = false,
    pending_featured_payment = COALESCE(pending_featured_payment, '{}'::jsonb)
      || jsonb_build_object(
        'status', COALESCE(pending_featured_payment->>'status', 'expired'),
        'expired_at', COALESCE(featured_expires_at::text, now()::text),
        'expiry_repaired_at', now()::text
      )
WHERE featured_enabled = true
  AND (featured_expires_at IS NULL OR featured_expires_at < now());

-- Deactivate stale listing_promotions rows
UPDATE public.listing_promotions
SET active = false
WHERE active = true
  AND ends_at IS NOT NULL
  AND ends_at < now();

-- 3) Backfill host_subscriptions.current_period_end where null but trial_end / cancel_at reveal a period
--    (Stripe API 2025-08-27.basil moved period fields onto items — this is a best-effort backfill
--     using data we already have; the reconciler will refresh the rest from Stripe.)
UPDATE public.host_subscriptions
SET current_period_end = trial_end
WHERE current_period_end IS NULL
  AND trial_end IS NOT NULL;
