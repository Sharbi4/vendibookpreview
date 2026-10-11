CREATE OR REPLACE FUNCTION public.initialize_sale_release_requirements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _payment public.payment_records%ROWTYPE;
BEGIN
  SELECT * INTO _payment FROM public.payment_records WHERE id = NEW.payment_record_id;
  IF _payment.sale_transaction_id IS NOT NULL AND NEW.release_state IS NULL THEN
    IF NEW.status = 'payout_completed' THEN
      NEW.release_state := 'payout_recorded';
      NEW.conditions_completed_at := COALESCE(NEW.payout_completed_at, NEW.paid_at, now());
    ELSE
      NEW.release_state := 'awaiting_walkthrough';
      NEW.conditions_deadline_at := COALESCE(_payment.captured_at, _payment.created_at) + interval '10 days';
      NEW.payout_eligible_at := NULL;
      NEW.hold_reason := 'Waiting for a saved walkthrough video and both signatures.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.initialize_sale_release_requirements() FROM PUBLIC, anon, authenticated;