-- Post-checkout sale audit (2026-10-07), database guards.
--
-- 1. Listing pages need to know a sale listing is already sold so they stop
--    offering Buy Now / Make Offer. listing_committed_sale stays service-only;
--    this exposes a yes/no answer and nothing about the buyer or sale.
-- 2. A cash (pending_cash) deal could be confirmed or completed while another
--    buyer's online payment had already committed the listing. The one-sale
--    guard now also checks moves into the confirmed / completed states.
-- 3. The old non-partial unique indexes on documents(transaction_id|booking_id,
--    document_type) predate the "one live document" design. They make a second
--    amendment or a re-issued (after voiding) agreement fail after SignNow has
--    already created it. The partial documents_one_live_per_* indexes remain.
-- 4. Buyers could read handoff_sessions.pickup_code directly from the table
--    (get_context hides it) and "verify" an in-person handoff alone.
-- 5. Sellers could insert handoff_media rows directly with any storage path and
--    satisfy the walkthrough-video payout condition without an upload. Media is
--    registered only through handoff-ops (service role) now.
-- 6. Delivery ETA: a structured window plus an append-only history of delivery
--    date and fulfillment status changes, so buyers see when their truck or
--    trailer is expected and every change is recorded.

-- 1 ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.listing_sale_committed(_listing_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.sale_transactions st
     WHERE st.listing_id = _listing_id
       AND st.status IN ('payment_authorized','paid','buyer_confirmed','seller_confirmed',
                         'confirmed','disputed','completed','paid_out','payout_failed')
  )
$function$;
REVOKE ALL ON FUNCTION public.listing_sale_committed(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listing_sale_committed(uuid) TO anon, authenticated, service_role;

-- 2 ------------------------------------------------------------------------
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
      OR NEW.status NOT IN ('payment_authorized','paid','buyer_confirmed','seller_confirmed',
                            'confirmed','completed')) THEN
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

-- 3 ------------------------------------------------------------------------
DROP INDEX IF EXISTS public.documents_unique_transaction_type_idx;
DROP INDEX IF EXISTS public.documents_unique_booking_type_idx;

-- 4 ------------------------------------------------------------------------
DO $$
DECLARE
  cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'handoff_sessions'
     AND column_name <> 'pickup_code';
  EXECUTE 'REVOKE SELECT ON public.handoff_sessions FROM authenticated, anon';
  EXECUTE format('GRANT SELECT (%s) ON public.handoff_sessions TO authenticated', cols);
END $$;

-- 5 ------------------------------------------------------------------------
DROP POLICY IF EXISTS "Participants add handoff media" ON public.handoff_media;

-- 6 ------------------------------------------------------------------------
ALTER TABLE public.sale_transactions
  ADD COLUMN IF NOT EXISTS estimated_delivery_end date;

CREATE TABLE IF NOT EXISTS public.sale_fulfillment_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_transaction_id uuid NOT NULL REFERENCES public.sale_transactions(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('eta', 'status')),
  from_value text,
  to_value text,
  note text,
  actor_id uuid,
  actor_role text CHECK (actor_role IN ('buyer', 'seller', 'admin', 'system')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sale_fulfillment_updates_sale_idx
  ON public.sale_fulfillment_updates (sale_transaction_id, created_at DESC);

ALTER TABLE public.sale_fulfillment_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sale parties read fulfillment updates" ON public.sale_fulfillment_updates;
CREATE POLICY "Sale parties read fulfillment updates"
  ON public.sale_fulfillment_updates FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sale_transactions st
       WHERE st.id = sale_fulfillment_updates.sale_transaction_id
         AND (st.buyer_id = auth.uid() OR st.seller_id = auth.uid())
    )
    OR public.is_admin(auth.uid())
  );
-- Writes happen only through sale-fulfillment-update (service role).
REVOKE INSERT, UPDATE, DELETE ON public.sale_fulfillment_updates FROM authenticated, anon;
