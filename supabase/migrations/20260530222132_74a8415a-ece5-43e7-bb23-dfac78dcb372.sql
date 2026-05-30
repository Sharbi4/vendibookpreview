
-- Add idempotency tracking columns to referral_status_log
ALTER TABLE public.referral_status_log
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS action_type text;

-- Add idempotency tracking columns to referral_fraud_flags
ALTER TABLE public.referral_fraud_flags
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS action_type text;

-- Unique partial indexes so retries with the same idempotency key cannot
-- create duplicate audit/fraud rows for the same (referral, action).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_referral_status_log_idem
  ON public.referral_status_log (referral_id, action_type, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_referral_fraud_flags_idem
  ON public.referral_fraud_flags (referral_id, action_type, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Extend log_referral_status_change to accept idempotency metadata.
CREATE OR REPLACE FUNCTION public.log_referral_status_change(
  p_referral_id uuid,
  p_new_status text,
  p_source text DEFAULT 'system'::text,
  p_note text DEFAULT NULL::text,
  p_idempotency_key text DEFAULT NULL,
  p_action_type text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_old text;
BEGIN
  SELECT status INTO v_old FROM public.referrals WHERE id = p_referral_id;
  UPDATE public.referrals
    SET status = p_new_status,
        updated_at = now(),
        qualified_at = CASE WHEN p_new_status = 'qualified' AND qualified_at IS NULL THEN now() ELSE qualified_at END,
        payout_date = CASE WHEN p_new_status = 'paid' THEN now() ELSE payout_date END
    WHERE id = p_referral_id;
  INSERT INTO public.referral_status_log
    (referral_id, old_status, new_status, changed_by_source, changed_by_user_id, note, idempotency_key, action_type)
  VALUES
    (p_referral_id, v_old, p_new_status, p_source,
     CASE WHEN p_source = 'admin' THEN auth.uid() ELSE NULL END,
     p_note, p_idempotency_key, p_action_type)
  ON CONFLICT ON CONSTRAINT uniq_referral_status_log_idem DO NOTHING;
END;
$function$;
