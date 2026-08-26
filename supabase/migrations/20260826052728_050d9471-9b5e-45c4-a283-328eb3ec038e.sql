GRANT SELECT ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;

CREATE INDEX IF NOT EXISTS documents_booking_id_type_idx ON public.documents (booking_id, document_type);
CREATE INDEX IF NOT EXISTS documents_transaction_id_type_idx ON public.documents (transaction_id, document_type);
CREATE UNIQUE INDEX IF NOT EXISTS documents_signnow_document_id_key ON public.documents (signnow_document_id) WHERE signnow_document_id IS NOT NULL;