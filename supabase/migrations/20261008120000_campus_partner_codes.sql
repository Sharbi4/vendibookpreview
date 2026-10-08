-- Superseded by 20261008200000_campus_partner_promo_codes.sql (owner decision:
-- Campus Partner runs on promo_codes). The objects below were retired there.
-- Campus Partner codes (2026-10-08).
--
-- School-specific codes (PIMA27, SCC27, ...) give a Vendibook-funded credit:
--   rentals:   rental_percent of the rental subtotal (excl. delivery, tax,
--              deposit), capped at rental_cap_cents per transaction
--   purchases: purchase_credit_cents on online equipment purchases of at
--              least purchase_min_cents (never cash / pay-in-person sales)
-- The host's / seller's price, commission basis and proceeds never change:
-- the credit is taken out of Vendibook's platform revenue.
--
-- discount_codes is the canonical marketplace discount table (promo_codes and
-- promo_code_uses are legacy and unused by any checkout). Campus codes are
-- discount_codes rows with campaign_type = 'campus_partner'.
-- discount_code_redemptions becomes the attribution ledger: one row per
-- checkout that applied a code, reserved at checkout, completed only when the
-- processor confirms the capture, and refund-aware.

-- Partners ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campus_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 160),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  city text,
  state text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.campus_partners ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.campus_partners FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.campus_partners TO authenticated;
GRANT ALL ON public.campus_partners TO service_role;
DROP POLICY IF EXISTS "Admins manage campus partners" ON public.campus_partners;
CREATE POLICY "Admins manage campus partners" ON public.campus_partners
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP TRIGGER IF EXISTS update_campus_partners_updated_at ON public.campus_partners;
CREATE TRIGGER update_campus_partners_updated_at BEFORE UPDATE ON public.campus_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Codes ---------------------------------------------------------------------
ALTER TABLE public.discount_codes
  ADD COLUMN IF NOT EXISTS campaign_type text NOT NULL DEFAULT 'monetization',
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.campus_partners(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS academic_year text,
  ADD COLUMN IF NOT EXISTS rental_percent numeric(5,2),
  ADD COLUMN IF NOT EXISTS rental_cap_cents integer,
  ADD COLUMN IF NOT EXISTS purchase_credit_cents integer,
  ADD COLUMN IF NOT EXISTS purchase_min_cents integer,
  ADD COLUMN IF NOT EXISTS per_user_rental_limit integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS per_user_purchase_limit integer NOT NULL DEFAULT 1;

-- Case- and whitespace-insensitive identity for every code.
ALTER TABLE public.discount_codes
  ADD COLUMN IF NOT EXISTS code_normalized text
  GENERATED ALWAYS AS (upper(regexp_replace(code, '\s', '', 'g'))) STORED;
CREATE UNIQUE INDEX IF NOT EXISTS discount_codes_code_normalized_key
  ON public.discount_codes (code_normalized);

ALTER TABLE public.discount_codes DROP CONSTRAINT IF EXISTS discount_codes_campaign_type_check;
ALTER TABLE public.discount_codes ADD CONSTRAINT discount_codes_campaign_type_check
  CHECK (campaign_type IN ('monetization', 'campus_partner'));

-- percent_off / amount_off_cents describe monetization codes only.
ALTER TABLE public.discount_codes DROP CONSTRAINT IF EXISTS discount_codes_amount_or_percent;
ALTER TABLE public.discount_codes ADD CONSTRAINT discount_codes_amount_or_percent CHECK (
  campaign_type <> 'monetization'
  OR (percent_off IS NOT NULL AND amount_off_cents IS NULL)
  OR (percent_off IS NULL AND amount_off_cents IS NOT NULL)
);

ALTER TABLE public.discount_codes DROP CONSTRAINT IF EXISTS discount_codes_campus_shape;
ALTER TABLE public.discount_codes ADD CONSTRAINT discount_codes_campus_shape CHECK (
  campaign_type <> 'campus_partner' OR (
    partner_id IS NOT NULL
    AND percent_off IS NULL AND amount_off_cents IS NULL
    AND (rental_percent IS NOT NULL OR purchase_credit_cents IS NOT NULL)
    AND (rental_percent IS NULL OR (rental_percent > 0 AND rental_percent <= 50 AND rental_cap_cents > 0))
    AND (purchase_credit_cents IS NULL OR (purchase_credit_cents > 0 AND purchase_min_cents >= 0))
    AND per_user_rental_limit >= 0 AND per_user_purchase_limit >= 0
    AND (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
  )
);

-- Codes were readable by every signed-in user. Campus codes are handed out by
-- schools, so the full list must not be enumerable: admins only. No checkout
-- reads this table from the browser (validation runs in edge functions).
-- Admins manage codes from the admin UI ("Admins manage discount codes"
-- policy); the table only granted SELECT, so writes need the privilege.
GRANT INSERT, UPDATE ON public.discount_codes TO authenticated;
DROP POLICY IF EXISTS "Authenticated can view active codes" ON public.discount_codes;
DROP POLICY IF EXISTS "Admins view discount codes" ON public.discount_codes;
CREATE POLICY "Admins view discount codes" ON public.discount_codes
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- Redemptions (attribution ledger) -----------------------------------------
ALTER TABLE public.discount_code_redemptions
  ALTER COLUMN purchase_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.campus_partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_type text,
  ADD COLUMN IF NOT EXISTS code_text text,
  ADD COLUMN IF NOT EXISTS transaction_type text,
  ADD COLUMN IF NOT EXISTS listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS booking_request_id uuid REFERENCES public.booking_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sale_transaction_id uuid REFERENCES public.sale_transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_record_id uuid REFERENCES public.payment_records(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS eligible_subtotal_cents integer,
  ADD COLUMN IF NOT EXISTS discount_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gmv_cents integer,
  ADD COLUMN IF NOT EXISTS platform_fee_cents integer,
  ADD COLUMN IF NOT EXISTS refunded_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS eligibility_restored boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS released_at timestamptz,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.discount_code_redemptions DROP CONSTRAINT IF EXISTS discount_code_redemptions_status_check;
ALTER TABLE public.discount_code_redemptions ADD CONSTRAINT discount_code_redemptions_status_check
  CHECK (status IN ('reserved', 'completed', 'released', 'refunded', 'partially_refunded'));
ALTER TABLE public.discount_code_redemptions DROP CONSTRAINT IF EXISTS discount_code_redemptions_type_check;
ALTER TABLE public.discount_code_redemptions ADD CONSTRAINT discount_code_redemptions_type_check
  CHECK (transaction_type IS NULL OR transaction_type IN ('rental', 'sale', 'monetization'));
ALTER TABLE public.discount_code_redemptions DROP CONSTRAINT IF EXISTS discount_code_redemptions_amounts_check;
ALTER TABLE public.discount_code_redemptions ADD CONSTRAINT discount_code_redemptions_amounts_check
  CHECK (discount_cents >= 0 AND refunded_cents >= 0);
ALTER TABLE public.discount_code_redemptions DROP CONSTRAINT IF EXISTS discount_code_redemptions_campus_target;
ALTER TABLE public.discount_code_redemptions ADD CONSTRAINT discount_code_redemptions_campus_target CHECK (
  campaign_type IS DISTINCT FROM 'campus_partner'
  OR (transaction_type = 'rental' AND booking_request_id IS NOT NULL AND sale_transaction_id IS NULL)
  OR (transaction_type = 'sale' AND sale_transaction_id IS NOT NULL AND booking_request_id IS NULL)
);

-- One live redemption per booking / sale / payment.
CREATE UNIQUE INDEX IF NOT EXISTS dcr_one_live_per_booking
  ON public.discount_code_redemptions (booking_request_id)
  WHERE booking_request_id IS NOT NULL AND status IN ('reserved', 'completed', 'partially_refunded');
CREATE UNIQUE INDEX IF NOT EXISTS dcr_one_live_per_sale
  ON public.discount_code_redemptions (sale_transaction_id)
  WHERE sale_transaction_id IS NOT NULL AND status IN ('reserved', 'completed', 'partially_refunded');
CREATE UNIQUE INDEX IF NOT EXISTS dcr_one_per_payment
  ON public.discount_code_redemptions (payment_record_id) WHERE payment_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS dcr_code_user_type_idx
  ON public.discount_code_redemptions (code_id, user_id, transaction_type, status);
CREATE INDEX IF NOT EXISTS dcr_partner_idx ON public.discount_code_redemptions (partner_id, status);

-- Users can read their own rows; nobody but the service role writes.
REVOKE INSERT, UPDATE, DELETE ON public.discount_code_redemptions FROM authenticated, anon;
DROP TRIGGER IF EXISTS update_discount_code_redemptions_updated_at ON public.discount_code_redemptions;
CREATE TRIGGER update_discount_code_redemptions_updated_at BEFORE UPDATE ON public.discount_code_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Reservation (atomic) -------------------------------------------------------
-- Called by the campus-partner-code edge function (service role) when a
-- shopper applies a code, and again before every payment to refresh amounts.
-- Serialised per code + user + transaction type, so two simultaneous
-- checkouts cannot both take a one-use purchase entitlement.
CREATE OR REPLACE FUNCTION public.campus_reserve_redemption(
  p_code_id uuid,
  p_user_id uuid,
  p_transaction_type text,
  p_booking_request_id uuid,
  p_sale_transaction_id uuid,
  p_listing_id uuid,
  p_eligible_subtotal_cents integer,
  p_discount_cents integer,
  p_gmv_cents integer,
  p_platform_fee_cents integer
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_code public.discount_codes%ROWTYPE;
  v_existing public.discount_code_redemptions%ROWTYPE;
  v_used integer;
  v_limit integer;
  v_id uuid;
BEGIN
  IF p_transaction_type NOT IN ('rental', 'sale') THEN
    RAISE EXCEPTION 'campus_invalid_type' USING ERRCODE = 'check_violation';
  END IF;
  IF p_discount_cents IS NULL OR p_discount_cents <= 0 THEN
    RAISE EXCEPTION 'campus_not_eligible' USING ERRCODE = 'check_violation';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    'campus:' || p_code_id::text || ':' || p_user_id::text || ':' || p_transaction_type, 0));

  SELECT * INTO v_code FROM public.discount_codes WHERE id = p_code_id;
  IF NOT FOUND OR v_code.campaign_type <> 'campus_partner' OR NOT v_code.active
     OR (v_code.starts_at IS NOT NULL AND v_code.starts_at > now())
     OR (v_code.ends_at IS NOT NULL AND v_code.ends_at <= now())
     OR NOT EXISTS (SELECT 1 FROM public.campus_partners p WHERE p.id = v_code.partner_id AND p.active) THEN
    RAISE EXCEPTION 'campus_code_inactive' USING ERRCODE = 'check_violation';
  END IF;

  -- The benefit follows the shopper's latest checkout: a reservation on
  -- another booking / sale is released unless a payment carrying it is in
  -- flight (that payment re-checks its reservation after recording itself,
  -- so a released one is never charged with the credit).
  UPDATE public.discount_code_redemptions r
     SET status = 'released', released_at = now()
   WHERE r.code_id = p_code_id AND r.user_id = p_user_id AND r.transaction_type = p_transaction_type
     AND r.status = 'reserved'
     AND NOT COALESCE(r.booking_request_id = p_booking_request_id, false)
     AND NOT COALESCE(r.sale_transaction_id = p_sale_transaction_id, false)
     AND NOT EXISTS (
       SELECT 1 FROM public.payment_records pr
        WHERE pr.fee_breakdown -> 'campus_partner' ->> 'redemption_id' = r.id::text
          AND pr.payment_status IN ('created', 'approved', 'pending', 'authorized')
          AND pr.created_at > now() - interval '3 hours');

  -- A live redemption already on this booking / sale.
  SELECT * INTO v_existing FROM public.discount_code_redemptions r
   WHERE r.status IN ('reserved', 'completed', 'partially_refunded')
     AND ((p_booking_request_id IS NOT NULL AND r.booking_request_id = p_booking_request_id)
       OR (p_sale_transaction_id IS NOT NULL AND r.sale_transaction_id = p_sale_transaction_id))
   FOR UPDATE;
  IF FOUND THEN
    IF v_existing.status <> 'reserved' THEN
      RAISE EXCEPTION 'campus_already_redeemed' USING ERRCODE = 'check_violation';
    END IF;
    IF v_existing.code_id = p_code_id AND v_existing.user_id = p_user_id THEN
      UPDATE public.discount_code_redemptions
         SET eligible_subtotal_cents = p_eligible_subtotal_cents, discount_cents = p_discount_cents,
             gmv_cents = p_gmv_cents, platform_fee_cents = p_platform_fee_cents, listing_id = p_listing_id
       WHERE id = v_existing.id;
      RETURN v_existing.id;
    END IF;
    -- A different code replaces the earlier one.
    UPDATE public.discount_code_redemptions SET status = 'released', released_at = now() WHERE id = v_existing.id;
  END IF;

  v_limit := CASE p_transaction_type WHEN 'rental' THEN v_code.per_user_rental_limit ELSE v_code.per_user_purchase_limit END;
  SELECT count(*) INTO v_used FROM public.discount_code_redemptions r
   WHERE r.code_id = p_code_id AND r.user_id = p_user_id AND r.transaction_type = p_transaction_type
     AND (r.status IN ('reserved', 'completed', 'partially_refunded')
          OR (r.status = 'refunded' AND NOT r.eligibility_restored));
  IF v_used >= v_limit THEN
    RAISE EXCEPTION 'campus_limit_reached' USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.discount_code_redemptions (
    code_id, user_id, partner_id, campaign_type, code_text, transaction_type, listing_id,
    booking_request_id, sale_transaction_id, eligible_subtotal_cents, discount_cents, gmv_cents,
    platform_fee_cents, status, redeemed_at)
  VALUES (
    p_code_id, p_user_id, v_code.partner_id, 'campus_partner', v_code.code_normalized, p_transaction_type, p_listing_id,
    CASE WHEN p_transaction_type = 'rental' THEN p_booking_request_id END,
    CASE WHEN p_transaction_type = 'sale' THEN p_sale_transaction_id END,
    p_eligible_subtotal_cents, p_discount_cents, p_gmv_cents, p_platform_fee_cents, 'reserved', now())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.campus_reserve_redemption(uuid, uuid, text, uuid, uuid, uuid, integer, integer, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.campus_reserve_redemption(uuid, uuid, text, uuid, uuid, uuid, integer, integer, integer, integer)
  TO service_role;

-- Payment → redemption sync --------------------------------------------------
-- Every processor path (capture endpoint, webhooks, reconcile, refunds) ends
-- in a payment_records update, so the redemption follows the payment here,
-- once per state change. The payment carries its redemption id in
-- fee_breakdown.campus_partner (written at order / charge creation).
CREATE OR REPLACE FUNCTION public.campus_sync_redemption_from_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_rid uuid;
  v_red public.discount_code_redemptions%ROWTYPE;
  v_done boolean;
  v_txn_refunded integer;
BEGIN
  BEGIN
    v_rid := NULLIF(NEW.fee_breakdown -> 'campus_partner' ->> 'redemption_id', '')::uuid;
  EXCEPTION WHEN others THEN
    RETURN NEW;
  END;
  IF v_rid IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT * INTO v_red FROM public.discount_code_redemptions WHERE id = v_rid FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Captured: the redemption counts from here on.
  IF NEW.payment_status = 'completed' AND OLD.payment_status IS DISTINCT FROM 'completed'
     AND v_red.status IN ('reserved', 'released') THEN
    -- The money moved with this redemption, so it is the one that counts; a
    -- newer reservation on the same booking / sale is released.
    UPDATE public.discount_code_redemptions
       SET status = 'released', released_at = now()
     WHERE id <> v_rid AND status = 'reserved'
       AND ((v_red.booking_request_id IS NOT NULL AND booking_request_id = v_red.booking_request_id)
         OR (v_red.sale_transaction_id IS NOT NULL AND sale_transaction_id = v_red.sale_transaction_id));
    UPDATE public.discount_code_redemptions
       SET status = 'completed', payment_record_id = NEW.id, completed_at = now(),
           discount_cents = COALESCE((NEW.fee_breakdown -> 'campus_partner' ->> 'credit_cents')::int, discount_cents)
     WHERE id = v_rid;
    INSERT INTO public.analytics_events (user_id, event_name, event_category, metadata, listing_id)
    VALUES (v_red.user_id, 'partner_transaction_completed', 'campus_partner',
            jsonb_build_object('code_id', v_red.code_id, 'partner_id', v_red.partner_id,
                               'transaction_type', v_red.transaction_type, 'credit_cents', v_red.discount_cents,
                               'redemption_id', v_red.id, 'source', 'server'),
            v_red.listing_id);
    RETURN NEW;
  END IF;

  IF v_red.status NOT IN ('completed', 'partially_refunded') THEN
    RETURN NEW;
  END IF;

  -- A rental's refundable security deposit is returned through the same
  -- payment; that is not a refund of the rental itself.
  v_txn_refunded := CASE WHEN v_red.transaction_type = 'rental'
    THEN greatest(0, COALESCE(NEW.refunded_cents, 0) - COALESCE(NEW.deposit_cents, 0))
    ELSE COALESCE(NEW.refunded_cents, 0) END;

  IF NEW.payment_status IN ('refunded', 'reversed')
     AND OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    -- Refunded before the rental / sale was completed: the shopper may use
    -- the benefit again.
    v_done := EXISTS (SELECT 1 FROM public.booking_requests b WHERE b.id = NEW.booking_request_id AND b.status = 'completed')
           OR EXISTS (SELECT 1 FROM public.sale_transactions s WHERE s.id = NEW.sale_transaction_id
                       AND s.status IN ('completed', 'paid_out', 'payout_failed'));
    UPDATE public.discount_code_redemptions
       SET status = 'refunded', refunded_cents = COALESCE(NEW.refunded_cents, 0), refunded_at = now(),
           eligibility_restored = NOT v_done
     WHERE id = v_rid;
    INSERT INTO public.analytics_events (user_id, event_name, event_category, metadata, listing_id)
    VALUES (v_red.user_id, 'partner_transaction_refunded', 'campus_partner',
            jsonb_build_object('code_id', v_red.code_id, 'partner_id', v_red.partner_id,
                               'transaction_type', v_red.transaction_type, 'full', true,
                               'redemption_id', v_red.id, 'source', 'server'),
            v_red.listing_id);
  ELSIF COALESCE(NEW.refunded_cents, 0) IS DISTINCT FROM COALESCE(OLD.refunded_cents, 0) THEN
    UPDATE public.discount_code_redemptions
       SET refunded_cents = COALESCE(NEW.refunded_cents, 0),
           status = CASE WHEN v_txn_refunded > 0 THEN 'partially_refunded' ELSE status END,
           refunded_at = CASE WHEN v_txn_refunded > 0 THEN now() ELSE refunded_at END
     WHERE id = v_rid;
    IF v_txn_refunded > 0 AND v_red.status = 'completed' THEN
      INSERT INTO public.analytics_events (user_id, event_name, event_category, metadata, listing_id)
      VALUES (v_red.user_id, 'partner_transaction_refunded', 'campus_partner',
              jsonb_build_object('code_id', v_red.code_id, 'partner_id', v_red.partner_id,
                                 'transaction_type', v_red.transaction_type, 'full', false,
                                 'redemption_id', v_red.id, 'source', 'server'),
              v_red.listing_id);
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN others THEN
  -- Attribution must never block or roll back a payment update.
  RAISE WARNING 'campus_sync_redemption_failed: % (payment %)', SQLERRM, NEW.id;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.campus_sync_redemption_from_payment() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_campus_sync_redemption ON public.payment_records;
CREATE TRIGGER trg_campus_sync_redemption
  AFTER UPDATE OF payment_status, refunded_cents ON public.payment_records
  FOR EACH ROW EXECUTE FUNCTION public.campus_sync_redemption_from_payment();

-- Admin reporting ------------------------------------------------------------
-- Aggregates only: no shopper names, emails or payment details.
CREATE OR REPLACE FUNCTION public.campus_partner_stats()
RETURNS TABLE (
  code_id uuid,
  partner_id uuid,
  redemptions bigint,
  unique_users bigint,
  rental_transactions bigint,
  purchase_transactions bigint,
  gmv_cents bigint,
  credits_cents bigint,
  refunded_transactions bigint,
  released_reservations bigint,
  platform_revenue_cents bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin(auth.uid()) AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY
  SELECT c.id, c.partner_id,
    count(r.id) FILTER (WHERE r.status IN ('completed', 'partially_refunded', 'refunded')),
    count(DISTINCT r.user_id) FILTER (WHERE r.status IN ('completed', 'partially_refunded', 'refunded')),
    count(r.id) FILTER (WHERE r.transaction_type = 'rental' AND r.status IN ('completed', 'partially_refunded')),
    count(r.id) FILTER (WHERE r.transaction_type = 'sale' AND r.status IN ('completed', 'partially_refunded')),
    COALESCE(sum(r.gmv_cents) FILTER (WHERE r.status IN ('completed', 'partially_refunded')), 0)::bigint,
    COALESCE(sum(r.discount_cents) FILTER (WHERE r.status IN ('completed', 'partially_refunded')), 0)::bigint,
    count(r.id) FILTER (WHERE r.status IN ('refunded', 'partially_refunded')),
    count(r.id) FILTER (WHERE r.status = 'released'),
    COALESCE(sum(r.platform_fee_cents - r.discount_cents) FILTER (WHERE r.status IN ('completed', 'partially_refunded')), 0)::bigint
  FROM public.discount_codes c
  LEFT JOIN public.discount_code_redemptions r ON r.code_id = c.id
  WHERE c.campaign_type = 'campus_partner'
  GROUP BY c.id, c.partner_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.campus_partner_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.campus_partner_stats() TO authenticated, service_role;
