CREATE OR REPLACE FUNCTION public.sync_partner_redemption()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u public.promo_code_uses%ROWTYPE; refunded integer; new_status text; evt text;
BEGIN
  SELECT * INTO u FROM public.promo_code_uses WHERE payment_record_id = NEW.id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  refunded := coalesce(NEW.refunded_cents, 0);
  new_status := u.status;
  IF NEW.payment_status::text = 'refunded' OR (refunded > 0 AND refunded >= coalesce(NEW.gross_amount_cents, 0)) THEN
    IF u.status IN ('completed','partially_refunded') THEN evt := 'partner_transaction_refunded'; END IF;
    new_status := 'released';
  ELSIF NEW.payment_status::text IN ('failed','cancelled','declined','reversed','authorization_voided','authorization_expired') THEN
    IF u.status = 'reserved' THEN new_status := 'released'; END IF;
  ELSIF NEW.payment_status::text = 'partially_refunded' OR refunded > 0 THEN
    IF u.status IN ('completed','reserved','partially_refunded') THEN
      IF u.status <> 'partially_refunded' THEN evt := 'partner_transaction_refunded'; END IF;
      new_status := 'partially_refunded';
    END IF;
  ELSIF NEW.payment_status::text = 'completed' AND u.status = 'reserved' THEN
    new_status := 'completed'; evt := 'partner_transaction_completed';
  END IF;

  IF new_status IS DISTINCT FROM u.status OR refunded IS DISTINCT FROM u.refunded_cents THEN
    UPDATE public.promo_code_uses SET status = new_status, refunded_cents = refunded, updated_at = now(),
      completed_at = CASE WHEN new_status IN ('completed','partially_refunded') THEN coalesce(completed_at, now()) ELSE completed_at END,
      released_at = CASE WHEN new_status = 'released' THEN now() ELSE released_at END
    WHERE id = u.id;
    IF evt IS NOT NULL THEN
      -- Analytics must never block a payment update.
      BEGIN
        INSERT INTO public.analytics_events (user_id, event_name, event_category, listing_id, metadata)
        VALUES (u.user_id, evt, 'campus_partner', NEW.listing_id, jsonb_build_object(
          'promo_code_id', u.promo_code_id, 'kind', u.redemption_kind, 'credit_cents', u.credit_cents,
          'refunded_cents', refunded, 'full_refund', new_status = 'released'));
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'campus partner analytics skipped: %', SQLERRM;
      END;
    END IF;
  END IF;
  RETURN NEW;
END $$;