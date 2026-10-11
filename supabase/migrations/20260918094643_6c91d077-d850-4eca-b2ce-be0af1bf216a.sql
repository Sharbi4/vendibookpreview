ALTER TABLE public.dispute_cases
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'vendibook',
  ADD COLUMN IF NOT EXISTS paypal_dispute_id text,
  ADD COLUMN IF NOT EXISTS paypal_dispute_reason text,
  ADD COLUMN IF NOT EXISTS paypal_dispute_status text,
  ADD COLUMN IF NOT EXISTS paypal_dispute_outcome text,
  ADD COLUMN IF NOT EXISTS paypal_dispute_updated_at timestamptz;

ALTER TABLE public.dispute_cases ALTER COLUMN opened_by DROP NOT NULL;
ALTER TABLE public.dispute_cases DROP CONSTRAINT IF EXISTS dispute_cases_opened_by_role_check;
ALTER TABLE public.dispute_cases ADD CONSTRAINT dispute_cases_opened_by_role_check
  CHECK (opened_by_role = ANY (ARRAY['buyer','seller','admin','system']));
ALTER TABLE public.dispute_cases DROP CONSTRAINT IF EXISTS dispute_cases_source_check;
ALTER TABLE public.dispute_cases ADD CONSTRAINT dispute_cases_source_check
  CHECK (source = ANY (ARRAY['vendibook','paypal']));

CREATE UNIQUE INDEX IF NOT EXISTS dispute_cases_paypal_dispute_id_key
  ON public.dispute_cases (paypal_dispute_id) WHERE paypal_dispute_id IS NOT NULL;

ALTER TABLE public.dispute_case_messages ALTER COLUMN author_id DROP NOT NULL;