-- 1) Title status: accept current wizard values plus legacy values.
ALTER TABLE public.listing_ownership_details
  DROP CONSTRAINT IF EXISTS listing_ownership_details_title_status_check;
ALTER TABLE public.listing_ownership_details
  ADD CONSTRAINT listing_ownership_details_title_status_check
  CHECK (title_status = ANY (ARRAY[
    -- canonical (current wizard)
    'clean','salvage','rebuilt','bonded','no_title','not_sure',
    -- legacy (existing rows / older clients)
    'clear_title','lien_on_title','no_title_bill_of_sale'
  ]));

-- 2) Remove the duplicate legacy publish-limit trigger; keep the canonical one
--    (enforce_listing_publish_limit: free 2 / starter 5 / pro unlimited).
DROP TRIGGER IF EXISTS trg_enforce_host_listing_quota ON public.listings;

-- 3) Database-authoritative publish validation.
CREATE OR REPLACE FUNCTION public.enforce_publish_requirements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_becoming_published boolean;
  v_photos int;
  v_static boolean;
  v_titled boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_becoming_published := (NEW.status = 'published'::listing_status);
  ELSE
    v_becoming_published := (
      NEW.status = 'published'::listing_status
      AND OLD.status IS DISTINCT FROM 'published'::listing_status
    );
  END IF;

  IF NOT v_becoming_published THEN
    RETURN NEW;
  END IF;

  IF NEW.category IS NULL OR NEW.mode IS NULL THEN
    RAISE EXCEPTION 'publish_incomplete:category_mode' USING ERRCODE = 'P0001';
  END IF;

  IF NEW.title IS NULL OR length(btrim(NEW.title)) < 5 THEN
    RAISE EXCEPTION 'publish_incomplete:title' USING ERRCODE = 'P0001';
  END IF;

  IF NEW.description IS NULL OR length(btrim(NEW.description)) < 50 THEN
    RAISE EXCEPTION 'publish_incomplete:description' USING ERRCODE = 'P0001';
  END IF;

  v_photos := COALESCE(array_length(NEW.image_urls, 1), 0);
  IF v_photos < 3 THEN
    RAISE EXCEPTION 'publish_incomplete:photos' USING ERRCODE = 'P0001';
  END IF;

  IF NEW.city IS NULL OR btrim(NEW.city) = '' OR NEW.state IS NULL OR btrim(NEW.state) = '' THEN
    RAISE EXCEPTION 'publish_incomplete:location' USING ERRCODE = 'P0001';
  END IF;

  v_static := NEW.category IN (
    'ghost_kitchen'::listing_category,
    'vendor_lot'::listing_category,
    'vendor_space'::listing_category
  );
  v_titled := NEW.category IN (
    'food_truck'::listing_category,
    'food_trailer'::listing_category
  );

  IF NEW.fulfillment_type IS NULL THEN
    RAISE EXCEPTION 'publish_incomplete:fulfillment' USING ERRCODE = 'P0001';
  END IF;

  IF v_static THEN
    IF NEW.fulfillment_type <> 'on_site'::fulfillment_type THEN
      RAISE EXCEPTION 'publish_incomplete:fulfillment_on_site' USING ERRCODE = 'P0001';
    END IF;
    IF NEW.address IS NULL OR btrim(NEW.address) = '' THEN
      RAISE EXCEPTION 'publish_incomplete:address' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Pricing + payment options by mode.
  IF NEW.mode = 'sale'::listing_mode THEN
    IF COALESCE(NEW.price_sale, 0) <= 0 THEN
      RAISE EXCEPTION 'publish_incomplete:price_sale' USING ERRCODE = 'P0001';
    END IF;
    IF NOT (COALESCE(NEW.accept_paypal_checkout, false) OR COALESCE(NEW.accept_cash_payment, false)) THEN
      RAISE EXCEPTION 'publish_incomplete:payment_option' USING ERRCODE = 'P0001';
    END IF;
    IF v_titled AND (NEW.title_status IS NULL OR btrim(NEW.title_status) = '') THEN
      RAISE EXCEPTION 'publish_incomplete:title_status' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    IF COALESCE(NEW.price_daily, 0) <= 0
       AND COALESCE(NEW.price_weekly, 0) <= 0
       AND COALESCE(NEW.price_monthly, 0) <= 0
       AND COALESCE(NEW.price_hourly, 0) <= 0 THEN
      RAISE EXCEPTION 'publish_incomplete:price_rent' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_publish_requirements ON public.listings;
CREATE TRIGGER trg_enforce_publish_requirements
  BEFORE INSERT OR UPDATE OF status ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_publish_requirements();

-- 4) Paid entitlements can never be self-granted by an ordinary user.
CREATE OR REPLACE FUNCTION public.protect_listing_paid_entitlements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := COALESCE(
    current_setting('request.jwt.claims', true)::jsonb ->> 'role',
    current_user
  );
  v_privileged boolean;
BEGIN
  v_privileged := v_role IN ('service_role', 'postgres', 'supabase_admin')
    OR public.is_admin(auth.uid());

  IF v_privileged THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.featured_enabled := false;
    NEW.featured_expires_at := NULL;
    NEW.featured_at := NULL;
    NEW.featured_source := NULL;
    NEW.proof_notary_enabled := false;
    RETURN NEW;
  END IF;

  -- Updates: preserve whatever the server previously granted; the client may
  -- only turn a paid benefit OFF, never ON.
  IF COALESCE(NEW.featured_enabled, false) AND NOT COALESCE(OLD.featured_enabled, false) THEN
    NEW.featured_enabled := OLD.featured_enabled;
  END IF;
  NEW.featured_expires_at := OLD.featured_expires_at;
  NEW.featured_at := OLD.featured_at;
  NEW.featured_source := OLD.featured_source;

  IF COALESCE(NEW.proof_notary_enabled, false) AND NOT COALESCE(OLD.proof_notary_enabled, false) THEN
    NEW.proof_notary_enabled := OLD.proof_notary_enabled;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_listing_paid_entitlements ON public.listings;
CREATE TRIGGER trg_protect_listing_paid_entitlements
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.protect_listing_paid_entitlements();