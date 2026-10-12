CREATE OR REPLACE FUNCTION public.trg_guard_offer_user_update()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF public.is_admin(auth.uid()) THEN RETURN NEW; END IF;
  IF NEW.listing_id   IS DISTINCT FROM OLD.listing_id   THEN RAISE EXCEPTION 'listing_id is not user-editable'; END IF;
  IF NEW.buyer_id     IS DISTINCT FROM OLD.buyer_id     THEN RAISE EXCEPTION 'buyer_id is not user-editable'; END IF;
  IF NEW.seller_id    IS DISTINCT FROM OLD.seller_id    THEN RAISE EXCEPTION 'seller_id is not user-editable'; END IF;
  IF NEW.offer_amount IS DISTINCT FROM OLD.offer_amount THEN RAISE EXCEPTION 'offer_amount is not editable after submission'; END IF;
  IF OLD.agreed_amount IS NOT NULL AND NEW.agreed_amount IS DISTINCT FROM OLD.agreed_amount THEN RAISE EXCEPTION 'agreed price is locked'; END IF;
  IF auth.uid() = OLD.buyer_id AND auth.uid() <> OLD.seller_id THEN
    IF NEW.counter_amount IS DISTINCT FROM OLD.counter_amount
       OR NEW.counter_message IS DISTINCT FROM OLD.counter_message
       OR NEW.counter_expires_at IS DISTINCT FROM OLD.counter_expires_at
       OR NEW.seller_response IS DISTINCT FROM OLD.seller_response THEN
      RAISE EXCEPTION 'buyers cannot modify seller response fields';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('cancelled', 'accepted', 'declined', 'expired') THEN
      RAISE EXCEPTION 'invalid buyer status transition';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;