
-- Bind request-mode sale intents to the existing invoice architecture.
ALTER TABLE public.sale_transactions
  ADD COLUMN IF NOT EXISTS invoice_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_offer_id uuid REFERENCES public.offers(id);
CREATE UNIQUE INDEX invoice_sale_terms_once ON public.sale_transactions(terms_id)
  WHERE invoice_required AND terms_id IS NOT NULL;
CREATE UNIQUE INDEX one_open_purchase_request_per_buyer ON public.sale_purchase_requests(listing_id,buyer_id)
  WHERE status IN ('requested','under_review','revision_pending','approved');

CREATE OR REPLACE FUNCTION public.guard_invoice_sale_snapshot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='UPDATE' THEN
    IF OLD.invoice_required AND (NEW.invoice_required IS DISTINCT FROM OLD.invoice_required OR NEW.source_offer_id IS DISTINCT FROM OLD.source_offer_id
      OR NEW.buyer_id IS DISTINCT FROM OLD.buyer_id OR NEW.seller_id IS DISTINCT FROM OLD.seller_id OR NEW.listing_id IS DISTINCT FROM OLD.listing_id) THEN
      RAISE EXCEPTION 'Invoice sale identity is immutable';
    END IF;
    IF EXISTS (SELECT 1 FROM public.sale_purchase_requests r WHERE r.sale_id=OLD.id) AND (
      NEW.fulfillment_type IS DISTINCT FROM OLD.fulfillment_type OR NEW.delivery_address IS DISTINCT FROM OLD.delivery_address
      OR NEW.delivery_fee IS DISTINCT FROM OLD.delivery_fee OR NEW.freight_cost IS DISTINCT FROM OLD.freight_cost
      OR NEW.terms_id IS DISTINCT FROM OLD.terms_id OR NEW.fee_rate_pct IS DISTINCT FROM OLD.fee_rate_pct
    ) THEN RAISE EXCEPTION 'Submitted purchase terms cannot be overwritten'; END IF;
  END IF;
  IF NEW.source_offer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.offers o WHERE o.id=NEW.source_offer_id AND o.buyer_id=NEW.buyer_id
      AND o.seller_id=NEW.seller_id AND o.listing_id=NEW.listing_id AND o.status='accepted' AND (o.agreed_amount=NEW.amount OR EXISTS (
        SELECT 1 FROM public.sale_purchase_requests r WHERE r.sale_id=NEW.id
        AND r.accepted_terms->>'revision_accepted_by'=NEW.buyer_id::text
        AND (r.accepted_terms->>'amount')::numeric=NEW.amount
      ))
  ) THEN RAISE EXCEPTION 'Accepted offer does not match purchase terms'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_invoice_sale_snapshot BEFORE INSERT OR UPDATE ON public.sale_transactions
FOR EACH ROW EXECUTE FUNCTION public.guard_invoice_sale_snapshot();
