-- Allow buyers and sellers to advance a Pay-in-Person sale from the pending_cash state.
-- Previously, both party-scoped UPDATE policies only matched rows already in 'paid' /
-- 'seller_confirmed' / 'buyer_confirmed', so a cash order (which starts as 'pending_cash')
-- silently failed RLS and confirmations from the UI were dropped without an error.

DROP POLICY IF EXISTS "Buyers can update their confirmation" ON public.sale_transactions;
DROP POLICY IF EXISTS "Sellers can update their confirmation" ON public.sale_transactions;

CREATE POLICY "Buyers can update their confirmation"
ON public.sale_transactions
FOR UPDATE
USING (
  auth.uid() = buyer_id
  AND status = ANY (ARRAY['pending_cash'::text, 'paid'::text, 'seller_confirmed'::text])
);

CREATE POLICY "Sellers can update their confirmation"
ON public.sale_transactions
FOR UPDATE
USING (
  auth.uid() = seller_id
  AND status = ANY (ARRAY['pending_cash'::text, 'paid'::text, 'buyer_confirmed'::text])
);