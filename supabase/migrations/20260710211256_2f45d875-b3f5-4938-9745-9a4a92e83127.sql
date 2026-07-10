
-- 1. Add idempotency_key column to email_send_log for enforceable dedup
ALTER TABLE public.email_send_log
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- 2. Partial unique index: at most one non-terminal or successful claim per idempotency_key.
-- 'failed' and 'dlq' rows are excluded so a permanent failure can be retried with the same key
-- only if code explicitly decides to; a 'pending' or 'sent' row blocks new claims atomically.
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_send_log_idem_active
  ON public.email_send_log (idempotency_key)
  WHERE idempotency_key IS NOT NULL
    AND status IN ('pending', 'sent', 'suppressed', 'bounced', 'complained');

CREATE INDEX IF NOT EXISTS idx_email_send_log_idem_any
  ON public.email_send_log (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 3. Mark the documented duplicate seller outreach (second send) for legacy tx
--    7c95ac1c-5163-45cd-a48f-b6ec50747cda.
--    We do NOT delete the provider record; only annotate metadata.
UPDATE public.email_send_log
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
  'duplicate_send_caused_by_missing_idempotency_enforcement', true,
  'documented_at', now(),
  'related_sale_transaction_id', '7c95ac1c-5163-45cd-a48f-b6ec50747cda',
  'first_send_message_id', '1bc8e93f-f3d1-4dc8-b0e9-6ef2b4a4f0c2'
)
WHERE message_id = '1925dff9-ae76-488a-aa42-7fe9050491fc';
