CREATE POLICY "Sellers view own payout actions"
ON public.payout_actions
FOR SELECT
TO authenticated
USING (
  subject_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.seller_payables sp
    WHERE sp.id = payout_actions.payable_id
      AND sp.seller_id = auth.uid()
  )
);

CREATE POLICY "Sellers request payout on own payable"
ON public.payout_actions
FOR INSERT
TO authenticated
WITH CHECK (
  action = 'seller_requested_payout'
  AND actor_id = auth.uid()
  AND subject_user_id = auth.uid()
  AND from_status IS NULL
  AND to_status IS NULL
  AND external_reference IS NULL
  AND payable_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.seller_payables sp
    WHERE sp.id = payout_actions.payable_id
      AND sp.seller_id = auth.uid()
  )
);