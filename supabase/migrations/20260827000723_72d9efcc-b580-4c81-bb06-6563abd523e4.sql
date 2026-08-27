CREATE OR REPLACE FUNCTION public.guard_booking_requests_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user = 'service_role' OR current_user = 'supabase_admin' OR current_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  -- Payment, payout, fee and tax state is owned by the server (PayPal
  -- webhooks / admin functions). Clients may never write these fields.
  NEW.payment_status := OLD.payment_status;
  NEW.payment_provider := OLD.payment_provider;
  NEW.payment_strategy := OLD.payment_strategy;
  NEW.payment_intent_id := OLD.payment_intent_id;
  NEW.deposit_status := OLD.deposit_status;
  NEW.deposit_amount := OLD.deposit_amount;
  NEW.deposit_charge_id := OLD.deposit_charge_id;
  NEW.deposit_refunded_at := OLD.deposit_refunded_at;
  NEW.deposit_refund_notes := OLD.deposit_refund_notes;
  NEW.hold_status := OLD.hold_status;
  NEW.hold_expires_at := OLD.hold_expires_at;
  NEW.payout_processed := OLD.payout_processed;
  NEW.payout_processed_at := OLD.payout_processed_at;
  NEW.payout_transfer_id := OLD.payout_transfer_id;
  NEW.payout_hold_reason := OLD.payout_hold_reason;
  NEW.payout_hold_set_by := OLD.payout_hold_set_by;
  NEW.payout_hold_until := OLD.payout_hold_until;
  NEW.host_platform_fee := OLD.host_platform_fee;
  NEW.host_fee_rate_pct := OLD.host_fee_rate_pct;
  NEW.pro_fee_applied := OLD.pro_fee_applied;
  NEW.fee_locked_at := OLD.fee_locked_at;
  NEW.tax_amount := OLD.tax_amount;
  NEW.tax_rate_pct := OLD.tax_rate_pct;
  NEW.tax_jurisdiction := OLD.tax_jurisdiction;
  NEW.tax_source := OLD.tax_source;
  NEW.documents_approved_at := OLD.documents_approved_at;
  NEW.documents_approved_by := OLD.documents_approved_by;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_booking_requests_update ON public.booking_requests;
CREATE TRIGGER trg_guard_booking_requests_update
BEFORE UPDATE ON public.booking_requests
FOR EACH ROW EXECUTE FUNCTION public.guard_booking_requests_update();