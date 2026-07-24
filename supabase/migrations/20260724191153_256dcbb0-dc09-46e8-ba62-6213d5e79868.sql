DROP VIEW IF EXISTS public.monetization_pending_reconciliation;

CREATE VIEW public.monetization_pending_reconciliation
WITH (security_invoker = true) AS
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