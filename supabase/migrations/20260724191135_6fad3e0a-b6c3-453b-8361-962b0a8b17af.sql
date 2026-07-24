-- 1. Status transition enforcement for monetization_purchases
CREATE OR REPLACE FUNCTION public.enforce_monetization_purchase_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_s text := OLD.status::text;
  new_s text := NEW.status::text;
  allowed boolean := false;
BEGIN
  IF old_s = new_s THEN
    RETURN NEW; -- no-op
  END IF;

  allowed := CASE old_s
    WHEN 'pending'   THEN new_s IN ('paid','failed','cancelled')
    WHEN 'paid'      THEN new_s IN ('fulfilled','refunded')
    WHEN 'fulfilled' THEN new_s IN ('refunded')
    ELSE false
  END;

  IF NOT allowed THEN
    RAISE EXCEPTION 'Invalid monetization_purchases status transition: % -> %', old_s, new_s
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_monetization_purchase_transition ON public.monetization_purchases;
CREATE TRIGGER trg_enforce_monetization_purchase_transition
BEFORE UPDATE OF status ON public.monetization_purchases
FOR EACH ROW EXECUTE FUNCTION public.enforce_monetization_purchase_transition();

-- 2. Refund audit table
CREATE TABLE IF NOT EXISTS public.monetization_refund_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.monetization_purchases(id) ON DELETE CASCADE,
  stripe_event_id TEXT NOT NULL,
  stripe_charge_id TEXT,
  stripe_refund_id TEXT,
  refund_amount_cents INTEGER NOT NULL CHECK (refund_amount_cents >= 0),
  refund_status TEXT NOT NULL CHECK (refund_status IN ('partial','full')),
  currency TEXT NOT NULL DEFAULT 'usd',
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_monetization_refund_events_event
  ON public.monetization_refund_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_monetization_refund_events_purchase
  ON public.monetization_refund_events(purchase_id, created_at DESC);

GRANT SELECT ON public.monetization_refund_events TO authenticated;
GRANT ALL    ON public.monetization_refund_events TO service_role;

ALTER TABLE public.monetization_refund_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view refund events"
  ON public.monetization_refund_events
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 3. Reconciliation view — purchases likely stuck
CREATE OR REPLACE VIEW public.monetization_pending_reconciliation AS
SELECT
  p.id,
  p.user_id,
  p.product_id,
  p.listing_id,
  p.stripe_session_id,
  p.stripe_payment_intent_id,
  p.amount_cents,
  p.status,
  p.fulfillment_status,
  p.created_at,
  p.paid_at,
  now() - p.created_at AS age
FROM public.monetization_purchases p
WHERE
  (p.status = 'pending' AND p.stripe_session_id IS NOT NULL AND p.created_at < now() - interval '15 minutes')
  OR
  (p.status = 'paid' AND p.fulfillment_status = 'pending' AND p.paid_at < now() - interval '10 minutes');

GRANT SELECT ON public.monetization_pending_reconciliation TO authenticated;
GRANT ALL    ON public.monetization_pending_reconciliation TO service_role;