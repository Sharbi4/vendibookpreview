
-- 1. Recovery / error context on the row itself
ALTER TABLE public.sale_transactions
  ADD COLUMN IF NOT EXISTS last_error jsonb;

-- 2. Audit log of every status change
CREATE TABLE IF NOT EXISTS public.sale_transaction_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.sale_transactions(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  reason text,
  actor uuid,
  actor_kind text NOT NULL DEFAULT 'system',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sale_tx_status_history_idem_uniq
  ON public.sale_transaction_status_history (transaction_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS sale_tx_status_history_tx_idx
  ON public.sale_transaction_status_history (transaction_id, created_at DESC);

GRANT SELECT ON public.sale_transaction_status_history TO authenticated;
GRANT ALL   ON public.sale_transaction_status_history TO service_role;

ALTER TABLE public.sale_transaction_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties can read their tx history"
  ON public.sale_transaction_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sale_transactions st
      WHERE st.id = sale_transaction_status_history.transaction_id
        AND (st.buyer_id = auth.uid() OR st.seller_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- 3. Trigger: enforce allowed transitions
CREATE OR REPLACE FUNCTION public.enforce_sale_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  allowed text[];
BEGIN
  IF NEW.status IS NULL THEN
    RAISE EXCEPTION 'sale_transactions.status cannot be NULL';
  END IF;

  -- Insert: only a subset of states may be the initial state.
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
    WHEN 'pending'        THEN ARRAY['paid','payment_failed','cancelled']
    WHEN 'pending_cash'   THEN ARRAY['paid','cancelled']
    WHEN 'payment_failed' THEN ARRAY['pending','cancelled']
    WHEN 'paid'           THEN ARRAY['confirmed','disputed','refunded','completed']
    WHEN 'confirmed'      THEN ARRAY['completed','disputed','refunded']
    WHEN 'disputed'       THEN ARRAY['refunded','completed']
    WHEN 'completed'      THEN ARRAY['paid_out','payout_failed','disputed']
    WHEN 'payout_failed'  THEN ARRAY['completed','paid_out']
    ELSE ARRAY[]::text[]  -- terminals: paid_out, refunded, cancelled
  END;

  IF NOT (NEW.status = ANY(allowed)) THEN
    RAISE EXCEPTION 'Illegal sale transition % → % (allowed: %)',
      OLD.status, NEW.status, allowed
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_sale_status_transition ON public.sale_transactions;
CREATE TRIGGER trg_enforce_sale_status_transition
  BEFORE INSERT OR UPDATE OF status ON public.sale_transactions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sale_status_transition();

-- 4. Trigger: write history on every status change
CREATE OR REPLACE FUNCTION public.log_sale_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.sale_transaction_status_history
      (transaction_id, from_status, to_status, reason, actor, actor_kind, metadata)
    VALUES
      (NEW.id, OLD.status, NEW.status,
       COALESCE(NEW.last_error->>'reason', NULL),
       auth.uid(),
       CASE WHEN auth.uid() IS NULL THEN 'system' ELSE 'user' END,
       COALESCE(NEW.last_error, '{}'::jsonb));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_sale_status_change ON public.sale_transactions;
CREATE TRIGGER trg_log_sale_status_change
  AFTER UPDATE OF status ON public.sale_transactions
  FOR EACH ROW EXECUTE FUNCTION public.log_sale_status_change();

-- 5. Idempotent status update RPC
CREATE OR REPLACE FUNCTION public.update_sale_transaction_status(
  p_transaction_id uuid,
  p_to_status text,
  p_reason text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL,
  p_actor_kind text DEFAULT 'system',
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_last_error jsonb DEFAULT NULL
)
RETURNS public.sale_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.sale_transactions;
  v_existing_history public.sale_transaction_status_history;
BEGIN
  -- Idempotency short-circuit: if we already applied this key, return the row.
  IF p_idempotency_key IS NOT NULL THEN
    SELECT h.* INTO v_existing_history
      FROM public.sale_transaction_status_history h
     WHERE h.transaction_id = p_transaction_id
       AND h.idempotency_key = p_idempotency_key
     LIMIT 1;

    IF v_existing_history.id IS NOT NULL THEN
      SELECT * INTO v_row FROM public.sale_transactions WHERE id = p_transaction_id;
      RETURN v_row;
    END IF;
  END IF;

  SELECT * INTO v_row FROM public.sale_transactions WHERE id = p_transaction_id FOR UPDATE;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Transaction % not found', p_transaction_id;
  END IF;

  -- Same-status no-op still records the idempotency key so callers can be safely retried.
  IF v_row.status = p_to_status THEN
    IF p_idempotency_key IS NOT NULL THEN
      INSERT INTO public.sale_transaction_status_history
        (transaction_id, from_status, to_status, reason, actor, actor_kind, metadata, idempotency_key)
      VALUES
        (v_row.id, v_row.status, v_row.status, p_reason, auth.uid(), p_actor_kind, COALESCE(p_metadata, '{}'::jsonb), p_idempotency_key)
      ON CONFLICT (transaction_id, idempotency_key) DO NOTHING;
    END IF;
    RETURN v_row;
  END IF;

  UPDATE public.sale_transactions
     SET status     = p_to_status,
         last_error = CASE WHEN p_last_error IS NOT NULL THEN p_last_error ELSE last_error END,
         updated_at = now()
   WHERE id = p_transaction_id
  RETURNING * INTO v_row;

  -- Attach the idempotency key to the audit row just written by the AFTER trigger.
  IF p_idempotency_key IS NOT NULL THEN
    UPDATE public.sale_transaction_status_history
       SET idempotency_key = p_idempotency_key,
           reason = COALESCE(p_reason, reason),
           actor_kind = p_actor_kind,
           metadata = COALESCE(p_metadata, '{}'::jsonb) || metadata
     WHERE id = (
       SELECT id FROM public.sale_transaction_status_history
        WHERE transaction_id = p_transaction_id
        ORDER BY created_at DESC
        LIMIT 1
     );
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.update_sale_transaction_status(uuid, text, text, text, text, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_sale_transaction_status(uuid, text, text, text, text, jsonb, jsonb) TO service_role;
