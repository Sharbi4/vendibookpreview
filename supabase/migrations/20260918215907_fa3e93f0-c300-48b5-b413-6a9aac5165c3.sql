ALTER TABLE public.sale_transactions
  ADD COLUMN IF NOT EXISTS buyer_address1 text,
  ADD COLUMN IF NOT EXISTS buyer_address2 text,
  ADD COLUMN IF NOT EXISTS buyer_city text,
  ADD COLUMN IF NOT EXISTS buyer_state text,
  ADD COLUMN IF NOT EXISTS buyer_zip text;