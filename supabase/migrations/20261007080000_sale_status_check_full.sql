-- The sale status CHECK dated from January and never gained the statuses the
-- state machine (enforce_sale_status_transition) and the decline sync trigger
-- (sync_sale_payment_attempt_status) use. A declined card capture therefore
-- failed to record: setting the sale to payment_failed violated this check,
-- the whole payment_records update rolled back, and the buyer saw "We received
-- your payment" instead of a decline. Allowed transitions stay enforced by the
-- trigger; this only lists every status the trigger can produce.
ALTER TABLE public.sale_transactions DROP CONSTRAINT IF EXISTS sale_transactions_status_check;
ALTER TABLE public.sale_transactions ADD CONSTRAINT sale_transactions_status_check CHECK (status = ANY (ARRAY[
  'pending', 'pending_cash', 'payment_authorized', 'payment_failed', 'paid',
  'confirmed', 'buyer_confirmed', 'seller_confirmed', 'completed', 'disputed',
  'refunded', 'cancelled', 'paid_out', 'payout_failed'
]::text[]));
