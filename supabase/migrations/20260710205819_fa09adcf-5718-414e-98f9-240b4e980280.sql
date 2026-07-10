
-- 1) Grandfather flag for the one historical cash sale with no terms evidence.
ALTER TABLE public.sale_transactions
  ADD COLUMN IF NOT EXISTS legacy_terms_unavailable boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.sale_transactions.legacy_terms_unavailable IS
  'TRUE only for rows created before the terms_id enforcement trigger (2026-07-10). '
  'No reconstructed terms snapshot exists for these rows — UI must not display '
  '"accepted terms" for them. Do NOT set this flag on new rows.';

-- Mark the single known historical row (idempotent; only touches this row and only the flag).
UPDATE public.sale_transactions
   SET legacy_terms_unavailable = true
 WHERE id = '7c95ac1c-5163-45cd-a48f-b6ec50747cda'
   AND terms_id IS NULL
   AND legacy_terms_unavailable = false;

-- 2) Enforcement trigger. Fires on INSERT and on UPDATE of terms_id / status.
CREATE OR REPLACE FUNCTION public.enforce_sale_transaction_terms_link()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
DECLARE
  v_terms public.transaction_terms;
  v_enforced_statuses text[] := ARRAY[
    'pending_cash','paid','buyer_confirmed','seller_confirmed',
    'completed','disputed','refunded'
  ];
BEGIN
  -- Grandfathered legacy rows: no enforcement, but block flipping the flag on new rows.
  IF NEW.legacy_terms_unavailable THEN
    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'legacy_terms_unavailable can only be set by an admin backfill, not on new rows'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  -- Only enforce for statuses that represent a real cash-sale commitment.
  IF NOT (NEW.status = ANY (v_enforced_statuses)) THEN
    RETURN NEW;
  END IF;

  IF NEW.terms_id IS NULL THEN
    RAISE EXCEPTION 'sale_transactions.terms_id is required for status %', NEW.status
      USING ERRCODE = 'not_null_violation';
  END IF;

  SELECT * INTO v_terms FROM public.transaction_terms WHERE id = NEW.terms_id;
  IF v_terms.id IS NULL THEN
    RAISE EXCEPTION 'terms_id % does not exist in transaction_terms', NEW.terms_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF v_terms.transaction_mode <> 'sale' THEN
    RAISE EXCEPTION 'terms_id % is not a sale terms snapshot (mode=%)',
      NEW.terms_id, v_terms.transaction_mode
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_terms.listing_id <> NEW.listing_id THEN
    RAISE EXCEPTION 'terms_id % listing mismatch (terms=% sale=%)',
      NEW.terms_id, v_terms.listing_id, NEW.listing_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_terms.buyer_id IS DISTINCT FROM NEW.buyer_id THEN
    RAISE EXCEPTION 'terms_id % buyer mismatch', NEW.terms_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_terms.host_id <> NEW.seller_id THEN
    RAISE EXCEPTION 'terms_id % host/seller mismatch', NEW.terms_id
      USING ERRCODE = 'check_violation';
  END IF;

  -- Once the terms row has been linked to a sale, that link is fixed to this sale.
  IF v_terms.sale_transaction_id IS NOT NULL AND v_terms.sale_transaction_id <> NEW.id THEN
    RAISE EXCEPTION 'terms_id % is already linked to a different sale_transaction', NEW.terms_id
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_enforce_sale_terms_link ON public.sale_transactions;
CREATE TRIGGER trg_enforce_sale_terms_link
BEFORE INSERT OR UPDATE OF terms_id, status, buyer_id, seller_id, listing_id, legacy_terms_unavailable
ON public.sale_transactions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_sale_transaction_terms_link();

-- 3) Idempotency store for edge functions (retry / double-click safety).
CREATE TABLE IF NOT EXISTS public.edge_action_idempotency (
  idempotency_key text NOT NULL,
  action          text NOT NULL,
  user_id         uuid NOT NULL,
  response        jsonb NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (action, idempotency_key, user_id)
);

GRANT SELECT ON public.edge_action_idempotency TO authenticated;
GRANT ALL    ON public.edge_action_idempotency TO service_role;

ALTER TABLE public.edge_action_idempotency ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_idempotency" ON public.edge_action_idempotency;
CREATE POLICY "users_read_own_idempotency"
  ON public.edge_action_idempotency
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_edge_action_idempotency_created_at
  ON public.edge_action_idempotency (created_at DESC);
