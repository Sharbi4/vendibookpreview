
-- Stale pending email claims: a request that won the atomic idempotency claim
-- but never transitioned out of 'pending' (worker crashed, edge function timed
-- out, etc.). These need manual/queue inspection before any resend — the
-- original message may already have been accepted by the provider.
CREATE OR REPLACE VIEW public.stale_pending_email_claims AS
SELECT
  id,
  message_id,
  idempotency_key,
  template_name,
  recipient_email,
  created_at,
  now() - created_at AS stuck_for,
  metadata
FROM public.email_send_log
WHERE status = 'pending'
  AND created_at < now() - interval '15 minutes'
ORDER BY created_at ASC;

GRANT SELECT ON public.stale_pending_email_claims TO service_role;

COMMENT ON VIEW public.stale_pending_email_claims IS
  'Email idempotency claims stuck in pending for >15 min. Ops must inspect queue/provider state before any resend — do not simply mark failed and retry.';
