ALTER TABLE public.transaction_terms
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transaction_terms_status_check'
  ) THEN
    ALTER TABLE public.transaction_terms
      ADD CONSTRAINT transaction_terms_status_check
      CHECK (status IN ('draft','active','superseded'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transaction_terms_status ON public.transaction_terms(status);