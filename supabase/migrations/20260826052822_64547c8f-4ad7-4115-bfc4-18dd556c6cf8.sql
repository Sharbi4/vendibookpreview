CREATE UNIQUE INDEX IF NOT EXISTS documents_unique_booking_type_idx
  ON public.documents (booking_id, document_type)
  WHERE booking_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS documents_unique_transaction_type_idx
  ON public.documents (transaction_id, document_type)
  WHERE transaction_id IS NOT NULL;