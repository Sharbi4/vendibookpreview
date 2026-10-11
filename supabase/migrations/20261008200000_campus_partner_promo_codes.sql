-- Campus Partner: one system, built on promo_codes / promo_code_uses
-- (owner decision 2026-10-08). The parallel discount_codes build
-- (20261008120000 / 20261008120100) is retired here; the promo_codes build
-- (drizzle 0006 / 0007) is extended with full attribution, refund-aware
-- statuses, a date-filtered admin report and the 2026-27 school codes.

-- 1. Retire the discount_codes Campus objects ------------------------------
DROP TRIGGER IF EXISTS trg_campus_sync_redemption ON public.payment_records;
DROP FUNCTION IF EXISTS public.campus_sync_redemption_from_payment();
DROP FUNCTION IF EXISTS public.campus_reserve_redemption(uuid, uuid, text, uuid, uuid, uuid, integer, integer, integer, integer);
DROP FUNCTION IF EXISTS public.campus_partner_stats();

DELETE FROM public.discount_code_redemptions WHERE campaign_type = 'campus_partner';
DELETE FROM public.discount_codes WHERE campaign_type = 'campus_partner';

DROP INDEX IF EXISTS public.dcr_one_live_per_booking;
DROP INDEX IF EXISTS public.dcr_one_live_per_sale;
DROP INDEX IF EXISTS public.dcr_one_per_payment;
DROP INDEX IF EXISTS public.dcr_code_user_type_idx;
DROP INDEX IF EXISTS public.dcr_partner_idx;
DROP TRIGGER IF EXISTS update_discount_code_redemptions_updated_at ON public.discount_code_redemptions;
ALTER TABLE public.discount_code_redemptions
  DROP CONSTRAINT IF EXISTS discount_code_redemptions_status_check,
  DROP CONSTRAINT IF EXISTS discount_code_redemptions_type_check,
  DROP CONSTRAINT IF EXISTS discount_code_redemptions_amounts_check,
  DROP CONSTRAINT IF EXISTS discount_code_redemptions_campus_target,
  DROP COLUMN IF EXISTS partner_id,
  DROP COLUMN IF EXISTS campaign_type,
  DROP COLUMN IF EXISTS code_text,
  DROP COLUMN IF EXISTS transaction_type,
  DROP COLUMN IF EXISTS listing_id,
  DROP COLUMN IF EXISTS booking_request_id,
  DROP COLUMN IF EXISTS sale_transaction_id,
  DROP COLUMN IF EXISTS payment_record_id,
  DROP COLUMN IF EXISTS eligible_subtotal_cents,
  DROP COLUMN IF EXISTS discount_cents,
  DROP COLUMN IF EXISTS gmv_cents,
  DROP COLUMN IF EXISTS platform_fee_cents,
  DROP COLUMN IF EXISTS refunded_cents,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS eligibility_restored,
  DROP COLUMN IF EXISTS completed_at,
  DROP COLUMN IF EXISTS released_at,
  DROP COLUMN IF EXISTS refunded_at,
  DROP COLUMN IF EXISTS created_at,
  DROP COLUMN IF EXISTS updated_at;
ALTER TABLE public.discount_code_redemptions ALTER COLUMN purchase_id SET NOT NULL;

DROP INDEX IF EXISTS public.discount_codes_code_normalized_key;
ALTER TABLE public.discount_codes
  DROP CONSTRAINT IF EXISTS discount_codes_campus_shape,
  DROP CONSTRAINT IF EXISTS discount_codes_campaign_type_check,
  DROP CONSTRAINT IF EXISTS discount_codes_amount_or_percent,
  DROP COLUMN IF EXISTS code_normalized,
  DROP COLUMN IF EXISTS partner_id,
  DROP COLUMN IF EXISTS academic_year,
  DROP COLUMN IF EXISTS rental_percent,
  DROP COLUMN IF EXISTS rental_cap_cents,
  DROP COLUMN IF EXISTS purchase_credit_cents,
  DROP COLUMN IF EXISTS purchase_min_cents,
  DROP COLUMN IF EXISTS per_user_rental_limit,
  DROP COLUMN IF EXISTS per_user_purchase_limit,
  DROP COLUMN IF EXISTS campaign_type;
ALTER TABLE public.discount_codes ADD CONSTRAINT discount_codes_amount_or_percent CHECK (
  (percent_off IS NOT NULL AND amount_off_cents IS NULL) OR (percent_off IS NULL AND amount_off_cents IS NOT NULL));
DROP TABLE IF EXISTS public.campus_partners;
-- Kept from 20261008120000: discount_codes are readable by admins only.

-- 2. Attribution snapshot on every redemption ------------------------------
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS partner_state text;

ALTER TABLE public.promo_code_uses
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS partner_name text,
  ADD COLUMN IF NOT EXISTS listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS booking_request_id uuid REFERENCES public.booking_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sale_transaction_id uuid REFERENCES public.sale_transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

-- 'refunded' = fully refunded after completion (benefit given back);
-- 'released' = reservation that never turned into a payment.
ALTER TABLE public.promo_code_uses DROP CONSTRAINT IF EXISTS promo_code_uses_status_check;
ALTER TABLE public.promo_code_uses ADD CONSTRAINT promo_code_uses_status_check
  CHECK (status IN ('reserved', 'completed', 'partially_refunded', 'refunded', 'released'));
CREATE INDEX IF NOT EXISTS promo_code_uses_completed_idx ON public.promo_code_uses (promo_code_id, completed_at);

-- Campus codes are checked only through the rate-limited campus-partner-code
-- function, never through the public promo lookup.
CREATE OR REPLACE FUNCTION public.lookup_promo_code(p_code text)
 RETURNS TABLE(id uuid, code text, discount_type text, discount_value numeric, max_uses integer, current_uses integer,
               min_purchase_amount numeric, applies_to text, expires_at timestamp with time zone, is_active boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT pc.id, pc.code, pc.discount_type, pc.discount_value,
         pc.max_uses, pc.current_uses, pc.min_purchase_amount,
         pc.applies_to, pc.expires_at, pc.is_active
  FROM public.promo_codes pc
  WHERE pc.is_active = true
    AND pc.program = 'standard'
    AND length(trim(coalesce(p_code, ''))) > 0
    AND upper(pc.code) = upper(trim(p_code))
    AND (pc.expires_at IS NULL OR pc.expires_at > now())
    AND (pc.max_uses IS NULL OR pc.current_uses < pc.max_uses)
  LIMIT 1;
$function$;

-- Atomic, idempotent reservation tied to one payment record (unchanged
-- rules), now also snapshotting code, school, listing and booking / sale.
CREATE OR REPLACE FUNCTION public.reserve_partner_redemption(
  p_code_id uuid, p_user uuid, p_kind text, p_payment_record uuid,
  p_credit_cents integer, p_base_cents integer, p_gross_cents integer, p_platform_fee_cents integer)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.promo_codes%ROWTYPE; lim integer; used integer; pr record;
BEGIN
  IF p_kind NOT IN ('rental','purchase') THEN RETURN 'invalid_kind'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_code_id::text || ':' || p_user::text || ':' || p_kind, 0));
  IF EXISTS (SELECT 1 FROM public.promo_code_uses WHERE payment_record_id = p_payment_record) THEN
    UPDATE public.promo_code_uses SET updated_at = now() WHERE payment_record_id = p_payment_record AND status = 'reserved';
    RETURN 'ok';
  END IF;
  SELECT * INTO c FROM public.promo_codes WHERE id = p_code_id;
  IF NOT FOUND OR NOT c.is_active OR c.program <> 'campus_partner'
     OR (c.starts_at IS NOT NULL AND c.starts_at > now()) THEN RETURN 'inactive'; END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at <= now() THEN RETURN 'expired'; END IF;
  lim := CASE WHEN p_kind = 'rental' THEN c.rental_uses_per_user ELSE c.purchase_uses_per_user END;
  used := public.partner_code_active_uses(p_code_id, p_user, p_kind, p_payment_record);
  IF used >= coalesce(lim, 0) THEN RETURN 'limit_reached'; END IF;
  SELECT listing_id, booking_request_id, sale_transaction_id INTO pr FROM public.payment_records WHERE id = p_payment_record;
  INSERT INTO public.promo_code_uses (promo_code_id, user_id, payment_record_id, redemption_kind, status,
    credit_cents, discount_applied, eligible_base_cents, gross_cents, platform_fee_cents,
    code, partner_name, listing_id, booking_request_id, sale_transaction_id)
  VALUES (p_code_id, p_user, p_payment_record, p_kind, 'reserved',
    p_credit_cents, p_credit_cents / 100.0, p_base_cents, p_gross_cents, p_platform_fee_cents,
    c.code, c.partner_name, pr.listing_id, pr.booking_request_id, pr.sale_transaction_id);
  RETURN 'ok';
END $$;
REVOKE ALL ON FUNCTION public.reserve_partner_redemption(uuid,uuid,text,uuid,integer,integer,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_partner_redemption(uuid,uuid,text,uuid,integer,integer,integer,integer) TO service_role;

-- 3. Payment -> redemption sync ---------------------------------------------
-- Every path (capture endpoint, webhooks, reconcile, refunds, admin) ends in
-- a payment_records update. Full refund -> 'refunded' (the benefit can be used
-- again); partial refund -> 'partially_refunded' (still used). A rental's
-- refundable deposit coming back is not a refund of the rental itself.
CREATE OR REPLACE FUNCTION public.sync_partner_redemption()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u public.promo_code_uses%ROWTYPE; refunded integer; txn_refunded integer; full_refund boolean;
  new_status text; evt text;
BEGIN
  SELECT * INTO u FROM public.promo_code_uses WHERE payment_record_id = NEW.id FOR UPDATE;
  IF NOT FOUND THEN RETURN NEW; END IF;
  refunded := coalesce(NEW.refunded_cents, 0);
  txn_refunded := CASE WHEN u.redemption_kind = 'rental'
    THEN greatest(0, refunded - coalesce(NEW.deposit_cents, 0)) ELSE refunded END;
  full_refund := NEW.payment_status::text IN ('refunded', 'reversed')
    OR (refunded > 0 AND refunded >= coalesce(NEW.gross_amount_cents, 0));
  new_status := u.status;

  IF full_refund THEN
    IF u.status IN ('completed', 'partially_refunded') THEN new_status := 'refunded'; evt := 'partner_transaction_refunded';
    ELSIF u.status = 'reserved' THEN new_status := 'released'; END IF;
  ELSIF NEW.payment_status::text IN ('failed','cancelled','declined','authorization_voided','authorization_expired') THEN
    IF u.status = 'reserved' THEN new_status := 'released'; END IF;
  ELSIF NEW.payment_status::text = 'completed' AND u.status IN ('reserved', 'released') THEN
    new_status := 'completed'; evt := 'partner_transaction_completed';
  ELSIF txn_refunded > 0 AND u.status IN ('completed', 'partially_refunded') THEN
    IF u.status = 'completed' THEN evt := 'partner_transaction_refunded'; END IF;
    new_status := 'partially_refunded';
  END IF;

  IF new_status IS DISTINCT FROM u.status OR refunded IS DISTINCT FROM u.refunded_cents THEN
    UPDATE public.promo_code_uses SET status = new_status, refunded_cents = refunded, updated_at = now(),
      completed_at = CASE WHEN new_status IN ('completed','partially_refunded','refunded') THEN coalesce(completed_at, now()) ELSE completed_at END,
      released_at = CASE WHEN new_status = 'released' AND u.status <> 'released' THEN now() ELSE released_at END,
      refunded_at = CASE WHEN new_status IN ('refunded','partially_refunded') AND new_status <> u.status THEN now() ELSE refunded_at END
    WHERE id = u.id;
    IF evt IS NOT NULL THEN
      BEGIN
        INSERT INTO public.analytics_events (user_id, event_name, event_category, listing_id, metadata)
        VALUES (u.user_id, evt, 'campus_partner', NEW.listing_id, jsonb_build_object(
          'promo_code_id', u.promo_code_id, 'code', u.code, 'partner_name', u.partner_name,
          'transaction_type', u.redemption_kind, 'credit_cents', u.credit_cents,
          'refunded_cents', refunded, 'full_refund', new_status = 'refunded', 'source', 'server'));
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'campus partner analytics skipped: %', SQLERRM;
      END;
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Attribution must never block or roll back a payment update.
  RAISE WARNING 'sync_partner_redemption failed for payment %: %', NEW.id, SQLERRM;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sync_partner_redemption() FROM PUBLIC, anon, authenticated;

-- 4. Admin report (aggregates only, optional date range) --------------------
CREATE OR REPLACE FUNCTION public.campus_partner_report(p_from timestamptz DEFAULT NULL, p_to timestamptz DEFAULT NULL)
RETURNS TABLE (
  id uuid, partner_name text, partner_state text, code text, academic_year text, is_active boolean,
  starts_at timestamptz, expires_at timestamptz, rental_percent numeric, rental_cap_cents integer,
  purchase_credit_cents integer, purchase_min_cents integer, rental_uses_per_user integer, purchase_uses_per_user integer,
  rental_redemptions bigint, purchase_redemptions bigint, unique_users bigint,
  rental_gmv_cents bigint, purchase_gmv_cents bigint, credits_cents bigint,
  refunded_transactions bigint, refunded_cents bigint, platform_fee_cents bigint, net_platform_revenue_cents bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.is_admin(auth.uid()) AND coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY
  WITH u AS (
    SELECT x.*, pr.tax_cents AS pr_tax, pr.deposit_cents AS pr_deposit, pr.gross_amount_cents AS pr_gross,
           x.status IN ('completed', 'partially_refunded') AS counted
    FROM public.promo_code_uses x
    LEFT JOIN public.payment_records pr ON pr.id = x.payment_record_id
    WHERE x.status IN ('completed', 'partially_refunded', 'refunded')
      AND (p_from IS NULL OR coalesce(x.completed_at, x.used_at) >= p_from)
      AND (p_to IS NULL OR coalesce(x.completed_at, x.used_at) < p_to)
  )
  SELECT c.id, c.partner_name, c.partner_state, c.code, c.academic_year, c.is_active, c.starts_at, c.expires_at,
    c.rental_percent, c.rental_cap_cents, c.purchase_credit_cents, c.purchase_min_cents,
    c.rental_uses_per_user, c.purchase_uses_per_user,
    count(u.id) FILTER (WHERE u.counted AND u.redemption_kind = 'rental'),
    count(u.id) FILTER (WHERE u.counted AND u.redemption_kind = 'purchase'),
    count(DISTINCT u.user_id) FILTER (WHERE u.counted),
    -- GMV = what the transaction was worth before the credit, without tax or deposit.
    coalesce(sum(coalesce(u.pr_gross, u.gross_cents) + u.credit_cents - coalesce(u.pr_tax, 0) - coalesce(u.pr_deposit, 0))
      FILTER (WHERE u.counted AND u.redemption_kind = 'rental'), 0)::bigint,
    coalesce(sum(coalesce(u.pr_gross, u.gross_cents) + u.credit_cents - coalesce(u.pr_tax, 0) - coalesce(u.pr_deposit, 0))
      FILTER (WHERE u.counted AND u.redemption_kind = 'purchase'), 0)::bigint,
    coalesce(sum(u.credit_cents) FILTER (WHERE u.counted), 0)::bigint,
    count(u.id) FILTER (WHERE u.status IN ('refunded', 'partially_refunded')),
    coalesce(sum(u.refunded_cents), 0)::bigint,
    coalesce(sum(u.platform_fee_cents) FILTER (WHERE u.counted), 0)::bigint,
    coalesce(sum(u.platform_fee_cents - u.credit_cents) FILTER (WHERE u.counted), 0)::bigint
  FROM public.promo_codes c
  LEFT JOIN u ON u.promo_code_id = c.id
  WHERE c.program = 'campus_partner'
  GROUP BY c.id;
END $$;
REVOKE ALL ON FUNCTION public.campus_partner_report(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.campus_partner_report(timestamptz, timestamptz) TO authenticated, service_role;

-- 5. School codes (2026-27) -------------------------------------------------
-- Same configuration as the current program. New codes start inactive and
-- are switched on from /admin/campus-partners once checkout is verified.
INSERT INTO public.promo_codes (code, description, discount_type, discount_value, applies_to, min_purchase_amount,
  is_active, program, partner_name, starts_at, expires_at, academic_year,
  rental_percent, rental_cap_cents, purchase_credit_cents, purchase_min_cents, rental_uses_per_user, purchase_uses_per_user)
SELECT v.code, 'Vendibook Campus Partner 2026-27', 'campus_partner', 10, 'all', 0,
  false, 'campus_partner', v.partner, now(), '2027-09-01T06:59:59Z', '2026-27',
  10, 10000, 25000, 500000, 2, 1
FROM (VALUES
  ('PIMA27', 'Pima Community College'),
  ('EMCC27', 'Estrella Mountain Community College'),
  ('ATC27', 'Atlanta Technical College'),
  ('OCC27', 'Orange Coast College'),
  ('LBCC27', 'Long Beach City College'),
  ('FSCJ27', 'Florida State College at Jacksonville'),
  ('CSCC27', 'Columbus State Community College'),
  ('TRIC27', 'Cuyahoga Community College')
) AS v(code, partner)
WHERE NOT EXISTS (SELECT 1 FROM public.promo_codes p WHERE p.normalized_code = upper(regexp_replace(v.code, '\s', '', 'g')));

UPDATE public.promo_codes p SET partner_state = s.state
FROM (VALUES
  ('Pima Community College', 'AZ'), ('Estrella Mountain Community College', 'AZ'), ('Scottsdale Community College', 'AZ'),
  ('Atlanta Technical College', 'GA'), ('Gwinnett Technical College', 'GA'),
  ('Houston City College', 'TX'), ('San Jacinto College', 'TX'),
  ('Miami Dade College', 'FL'), ('Florida State College at Jacksonville', 'FL'),
  ('Orange Coast College', 'CA'), ('Long Beach City College', 'CA'), ('Los Angeles Trade-Technical College', 'CA'),
  ('Columbus State Community College', 'OH'), ('Cuyahoga Community College', 'OH'),
  ('College of Southern Nevada', 'NV')
) AS s(name, state)
WHERE p.program = 'campus_partner' AND p.partner_name = s.name AND p.partner_state IS NULL;
