
CREATE OR REPLACE FUNCTION public.guard_sale_transactions_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user = 'service_role' OR public.is_privileged_financial_writer() THEN
    RETURN NEW;
  END IF;

  NEW.status := 'pending';
  NEW.payment_intent_id := NULL;
  NEW.platform_fee := 0;
  NEW.seller_payout := 0;
  NEW.payout_completed_at := NULL;
  NEW.fee_locked_at := NULL;
  NEW.payout_status := NULL;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Buyers can create transactions" ON public.sale_transactions;
CREATE POLICY "Buyers can create transactions"
ON public.sale_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = buyer_id
  AND status = 'pending'
  AND payment_intent_id IS NULL
  AND coalesce(platform_fee, 0) = 0
  AND coalesce(seller_payout, 0) = 0
  AND payout_completed_at IS NULL
);
