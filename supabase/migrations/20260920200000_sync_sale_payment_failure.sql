-- Keep the purchase's unpaid status consistent with its latest PayPal attempt.
-- This covers capture endpoints and webhooks without relying on the browser.
CREATE OR REPLACE FUNCTION public.sync_sale_payment_attempt_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  sale_status text;
  latest_id uuid;
BEGIN
  IF NEW.provider::text <> 'paypal' OR NEW.transaction_type <> 'sale' OR NEW.sale_transaction_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT status INTO sale_status FROM public.sale_transactions WHERE id = NEW.sale_transaction_id FOR UPDATE;
  IF NOT FOUND OR sale_status NOT IN ('pending','payment_authorized','payment_failed') THEN RETURN NEW; END IF;

  -- A verified completion may arrive after a failed attempt. Restore the legal
  -- transition into paid; only the existing verified finalizer marks it paid.
  IF NEW.payment_status::text = 'completed' THEN
    IF sale_status = 'payment_failed' THEN
      UPDATE public.sale_transactions SET status = 'pending', last_error = NULL WHERE id = NEW.sale_transaction_id;
    END IF;
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.payment_records WHERE sale_transaction_id = NEW.sale_transaction_id AND payment_status::text = 'completed') THEN RETURN NEW; END IF;

  SELECT id INTO latest_id FROM public.payment_records
    WHERE sale_transaction_id = NEW.sale_transaction_id AND provider::text = 'paypal' AND transaction_type = 'sale'
    ORDER BY created_at DESC, id DESC LIMIT 1;
  IF latest_id IS DISTINCT FROM NEW.id THEN RETURN NEW; END IF;

  IF NEW.payment_status::text IN ('declined','failed') THEN
    UPDATE public.sale_transactions SET status = 'payment_failed', last_error = NEW.last_error
      WHERE id = NEW.sale_transaction_id AND (status <> 'payment_failed' OR last_error IS DISTINCT FROM NEW.last_error);
  ELSIF NEW.payment_status::text IN ('created','approved','pending') AND sale_status = 'payment_failed' THEN
    UPDATE public.sale_transactions SET status = 'pending', last_error = NULL WHERE id = NEW.sale_transaction_id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_sale_payment_attempt_status() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_sync_sale_payment_attempt_status ON public.payment_records;
CREATE TRIGGER trg_sync_sale_payment_attempt_status AFTER INSERT OR UPDATE OF payment_status ON public.payment_records
  FOR EACH ROW EXECUTE FUNCTION public.sync_sale_payment_attempt_status();

-- Repair only unpaid purchases whose latest attempt definitively failed.
UPDATE public.sale_transactions s SET status = 'payment_failed', last_error = p.last_error
FROM public.payment_records p
WHERE s.status IN ('pending','payment_authorized') AND p.sale_transaction_id = s.id
  AND p.provider::text = 'paypal' AND p.transaction_type = 'sale' AND p.payment_status::text IN ('declined','failed')
  AND p.id = (SELECT id FROM public.payment_records WHERE sale_transaction_id=s.id AND provider::text='paypal' AND transaction_type='sale' ORDER BY created_at DESC,id DESC LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM public.payment_records WHERE sale_transaction_id=s.id AND payment_status::text='completed');
