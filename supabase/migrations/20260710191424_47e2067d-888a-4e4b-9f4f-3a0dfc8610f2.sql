ALTER TABLE public.sale_transactions
  ADD COLUMN IF NOT EXISTS terms_id uuid REFERENCES public.transaction_terms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sale_transactions_terms_id ON public.sale_transactions(terms_id);