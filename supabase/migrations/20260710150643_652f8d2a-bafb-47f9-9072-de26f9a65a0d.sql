ALTER TABLE public.sale_transactions
  ADD CONSTRAINT sale_transactions_buyer_seller_distinct_chk
  CHECK (buyer_id <> seller_id);