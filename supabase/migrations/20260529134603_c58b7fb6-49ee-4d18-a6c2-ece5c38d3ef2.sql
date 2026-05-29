
-- 1. Add pending boost column
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS pending_featured_payment jsonb;

-- 2. Trigger: when a listing is published, auto-apply pending boost
CREATE OR REPLACE FUNCTION public.apply_pending_featured_on_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_now timestamptz := now();
  v_expires timestamptz := now() + INTERVAL '30 days';
BEGIN
  -- Only act when transitioning into published with pending boost not yet applied
  IF NEW.status = 'published'
     AND NEW.pending_featured_payment IS NOT NULL
     AND COALESCE(NEW.featured_enabled, false) = false
  THEN
    NEW.featured_enabled := true;
    NEW.featured_at := v_now;
    NEW.featured_expires_at := v_expires;
    NEW.published_at := COALESCE(NEW.published_at, v_now);
    NEW.pending_featured_payment := NEW.pending_featured_payment
      || jsonb_build_object('applied_at', v_now, 'applied_expires_at', v_expires);

    -- Notify host
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      NEW.host_id,
      'listing',
      'Featured Boost Activated! ⭐',
      'Your prepaid Featured Boost has been automatically applied to "' || COALESCE(NEW.title, 'your listing') || '" for 30 days.',
      '/listing/' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_pending_featured ON public.listings;
CREATE TRIGGER trg_apply_pending_featured
  BEFORE UPDATE OF status ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_pending_featured_on_publish();

-- 3. Comp Stephanie's listing: she paid + we refunded; honor the boost as a courtesy when she publishes
UPDATE public.listings
SET pending_featured_payment = jsonb_build_object(
  'source', 'complimentary_credit',
  'reason', 'Courtesy boost after refund of pi_3TWF84A6Qt4pF0fM1RXYc3H2',
  'amount', '$30.00',
  'granted_at', now()::text
)
WHERE id = '43f29955-72d7-4897-bdd4-a41eed4150b1'
  AND pending_featured_payment IS NULL;
