-- Sale lifecycle fixes found by the 2026-10-07 post-purchase audit.
--
-- 1. Status transitions: the app (confirm-sale, dashboards) uses
--    buyer_confirmed / seller_confirmed, but the transition trigger never
--    allowed them, so every handoff confirmation failed and cash sales could
--    never progress. A capture PayPal confirms after an earlier failed attempt
--    must also be able to mark the sale paid.
-- 2. trg_guard_sale_transaction_user_update referenced columns that no longer
--    exist, so any non-admin update raised "record new has no field".
-- 3. Buyers and sellers no longer update sale_transactions directly. Every
--    status change goes through a server function; the old RLS rules would
--    have let either party mark a cash sale paid once (2) was repaired.
-- 4. A sale listing is a single unit: once one purchase is committed, no
--    second purchase may start or be marked paid.

CREATE OR REPLACE FUNCTION public.enforce_sale_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  allowed text[];
BEGIN
  IF NEW.status IS NULL THEN
    RAISE EXCEPTION 'sale_transactions.status cannot be NULL';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('pending','pending_cash','paid') THEN
      RAISE EXCEPTION 'Invalid initial sale status: %', NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = OLD.status THEN
    RETURN NEW; -- idempotent no-op
  END IF;

  allowed := CASE OLD.status
    WHEN 'pending'            THEN ARRAY['payment_authorized','paid','payment_failed','cancelled']
    WHEN 'payment_authorized' THEN ARRAY['paid','payment_failed','cancelled']
    WHEN 'pending_cash'       THEN ARRAY['paid','buyer_confirmed','seller_confirmed','completed','disputed','cancelled']
    WHEN 'payment_failed'     THEN ARRAY['pending','payment_authorized','paid','cancelled']
    WHEN 'paid'               THEN ARRAY['confirmed','buyer_confirmed','seller_confirmed','disputed','refunded','completed']
    WHEN 'buyer_confirmed'    THEN ARRAY['completed','disputed','refunded']
    WHEN 'seller_confirmed'   THEN ARRAY['completed','disputed','refunded']
    WHEN 'confirmed'          THEN ARRAY['completed','disputed','refunded']
    WHEN 'disputed'           THEN ARRAY['refunded','completed']
    WHEN 'completed'          THEN ARRAY['paid_out','payout_failed','disputed']
    WHEN 'payout_failed'      THEN ARRAY['completed','paid_out']
    ELSE ARRAY[]::text[]  -- terminals: paid_out, refunded, cancelled
  END;

  IF NOT (NEW.status = ANY(allowed)) THEN
    RAISE EXCEPTION 'Illegal sale transition % → % (allowed: %)',
      OLD.status, NEW.status, allowed
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_guard_sale_transaction_user_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  is_admin_user boolean;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  SELECT public.is_admin(auth.uid()) INTO is_admin_user;
  IF is_admin_user THEN
    RETURN NEW;
  END IF;
  IF NEW.amount          IS DISTINCT FROM OLD.amount          THEN RAISE EXCEPTION 'amount is not user-editable'; END IF;
  IF NEW.platform_fee    IS DISTINCT FROM OLD.platform_fee    THEN RAISE EXCEPTION 'platform_fee is not user-editable'; END IF;
  IF NEW.seller_payout   IS DISTINCT FROM OLD.seller_payout   THEN RAISE EXCEPTION 'seller_payout is not user-editable'; END IF;
  IF NEW.tracking_number IS DISTINCT FROM OLD.tracking_number THEN RAISE EXCEPTION 'tracking_number is not user-editable'; END IF;
  IF NEW.buyer_id        IS DISTINCT FROM OLD.buyer_id        THEN RAISE EXCEPTION 'buyer_id is not user-editable'; END IF;
  IF NEW.seller_id       IS DISTINCT FROM OLD.seller_id       THEN RAISE EXCEPTION 'seller_id is not user-editable'; END IF;
  IF NEW.listing_id      IS DISTINCT FROM OLD.listing_id      THEN RAISE EXCEPTION 'listing_id is not user-editable'; END IF;
  IF NEW.status          IS DISTINCT FROM OLD.status          THEN RAISE EXCEPTION 'status changes go through Vendibook'; END IF;
  RETURN NEW;
END;
$function$;

DROP POLICY IF EXISTS "Buyers can update their confirmation" ON public.sale_transactions;
DROP POLICY IF EXISTS "Sellers can update their confirmation" ON public.sale_transactions;

-- One committed purchase per sale listing.
CREATE OR REPLACE FUNCTION public.listing_committed_sale(_listing_id uuid, _exclude_sale uuid DEFAULT NULL)
 RETURNS uuid
 LANGUAGE sql
 VOLATILE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT st.id
    FROM public.sale_transactions st
   WHERE st.listing_id = _listing_id
     AND (_exclude_sale IS NULL OR st.id <> _exclude_sale)
     AND st.status IN ('payment_authorized','paid','buyer_confirmed','seller_confirmed',
                       'confirmed','disputed','completed','paid_out','payout_failed')
   ORDER BY st.updated_at DESC
   LIMIT 1
$function$;
REVOKE ALL ON FUNCTION public.listing_committed_sale(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.listing_committed_sale(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.block_second_committed_sale()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_other uuid;
BEGIN
  IF NEW.listing_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND (NEW.status IS NOT DISTINCT FROM OLD.status
      OR NEW.status NOT IN ('payment_authorized','paid')) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' AND NEW.status NOT IN ('pending','pending_cash','paid') THEN
    RETURN NEW;
  END IF;

  -- Serialize per listing so two captures cannot both commit.
  PERFORM pg_advisory_xact_lock(hashtextextended('sale_commit:' || NEW.listing_id::text, 0));

  SELECT st.id INTO v_other
    FROM public.sale_transactions st
   WHERE st.listing_id = NEW.listing_id
     AND st.id <> NEW.id
     AND st.status IN ('payment_authorized','paid','buyer_confirmed','seller_confirmed',
                       'confirmed','disputed','completed','paid_out','payout_failed')
   LIMIT 1;

  IF v_other IS NOT NULL THEN
    RAISE EXCEPTION 'listing_unavailable: This item has already been purchased by another buyer. (reason=sold)'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS a02_block_second_committed_sale ON public.sale_transactions;
CREATE TRIGGER a02_block_second_committed_sale
  BEFORE INSERT OR UPDATE OF status ON public.sale_transactions
  FOR EACH ROW EXECUTE FUNCTION public.block_second_committed_sale();
