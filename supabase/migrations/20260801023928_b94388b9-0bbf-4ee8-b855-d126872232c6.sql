CREATE OR REPLACE FUNCTION public.assert_listing_transactable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state jsonb;
  v_listing_id uuid;
BEGIN
  v_listing_id := NEW.listing_id;
  IF v_listing_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_state := public.listing_purchase_state(v_listing_id);
  IF COALESCE((v_state->>'purchasable')::boolean, false) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'listing_unavailable: This listing is no longer available and no payment was created. (reason=%)',
    COALESCE(v_state->>'reason', 'unknown')
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_requests_listing_available ON public.booking_requests;
CREATE TRIGGER trg_booking_requests_listing_available
  BEFORE INSERT ON public.booking_requests
  FOR EACH ROW EXECUTE FUNCTION public.assert_listing_transactable();

DROP TRIGGER IF EXISTS trg_offers_listing_available ON public.offers;
CREATE TRIGGER trg_offers_listing_available
  BEFORE INSERT ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.assert_listing_transactable();

DROP TRIGGER IF EXISTS trg_sale_transactions_listing_available ON public.sale_transactions;
CREATE TRIGGER trg_sale_transactions_listing_available
  BEFORE INSERT ON public.sale_transactions
  FOR EACH ROW EXECUTE FUNCTION public.assert_listing_transactable();

CREATE OR REPLACE FUNCTION public.admin_grant_complimentary_featured(p_listing_id uuid, p_days integer DEFAULT 30)
RETURNS listings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.listings;
  v_state jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  IF p_days IS NULL OR p_days < 1 OR p_days > 365 THEN
    RAISE EXCEPTION 'p_days must be between 1 and 365';
  END IF;

  v_state := public.listing_purchase_state(p_listing_id);
  IF NOT COALESCE((v_state->>'purchasable')::boolean, false) THEN
    RAISE EXCEPTION 'listing_unavailable: complimentary boosts require an available listing (reason=%)',
      COALESCE(v_state->>'reason', 'unknown')
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.listings SET
    featured_enabled    = true,
    featured_at         = now(),
    featured_expires_at = now() + (p_days || ' days')::interval,
    featured_source     = 'comp'
  WHERE id = p_listing_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  RETURN v_row;
END;
$$;