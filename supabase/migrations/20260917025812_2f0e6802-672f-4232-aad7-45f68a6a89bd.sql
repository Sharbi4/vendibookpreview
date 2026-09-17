
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

  RETURN NEW;
END;
$$;
