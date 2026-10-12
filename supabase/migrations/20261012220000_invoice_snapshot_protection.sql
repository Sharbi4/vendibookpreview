-- Preserve issued financial terms while allowing authenticated payment lifecycle updates.
CREATE OR REPLACE FUNCTION public.guard_invoice_sale_snapshot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE request public.sale_purchase_requests; invoice public.sale_invoices; existing_offer boolean:=false;
BEGIN
  IF TG_OP='UPDATE' THEN
    existing_offer:=OLD.source_offer_id IS NOT NULL AND OLD.source_offer_id=NEW.source_offer_id;
    IF OLD.invoice_required AND (NEW.invoice_required IS DISTINCT FROM OLD.invoice_required OR NEW.source_offer_id IS DISTINCT FROM OLD.source_offer_id
      OR NEW.buyer_id IS DISTINCT FROM OLD.buyer_id OR NEW.seller_id IS DISTINCT FROM OLD.seller_id OR NEW.listing_id IS DISTINCT FROM OLD.listing_id) THEN
      RAISE EXCEPTION 'Invoice sale identity is immutable';
    END IF;
    SELECT * INTO request FROM public.sale_purchase_requests r WHERE r.sale_id=OLD.id;
    IF FOUND THEN
      IF ROW(NEW.fulfillment_type,NEW.delivery_address,NEW.delivery_instructions,NEW.delivery_fee,NEW.freight_cost,NEW.terms_id,NEW.fee_rate_pct,NEW.buyer_name,NEW.buyer_email)
        IS DISTINCT FROM ROW(OLD.fulfillment_type,OLD.delivery_address,OLD.delivery_instructions,OLD.delivery_fee,OLD.freight_cost,OLD.terms_id,OLD.fee_rate_pct,OLD.buyer_name,OLD.buyer_email)
      THEN RAISE EXCEPTION 'Submitted purchase terms cannot be overwritten'; END IF;
      IF NEW.amount IS DISTINCT FROM OLD.amount AND NEW.amount IS DISTINCT FROM (request.accepted_terms->>'amount')::numeric
      THEN RAISE EXCEPTION 'Purchase price requires accepted revision'; END IF;
    END IF;
  END IF;
  IF NEW.source_offer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.offers o WHERE o.id=NEW.source_offer_id AND o.buyer_id=NEW.buyer_id
      AND o.seller_id=NEW.seller_id AND o.listing_id=NEW.listing_id
      AND (o.status='accepted' OR (existing_offer AND o.status='purchased'))
      AND (o.agreed_amount=NEW.amount OR EXISTS (
        SELECT 1 FROM public.sale_purchase_requests r WHERE r.sale_id=NEW.id
        AND r.accepted_terms->>'revision_accepted_by'=NEW.buyer_id::text
        AND (r.accepted_terms->>'amount')::numeric=NEW.amount
      ))
  ) THEN RAISE EXCEPTION 'Accepted offer does not match purchase terms'; END IF;
  SELECT * INTO invoice FROM public.sale_invoices i WHERE i.sale_id=NEW.id;
  IF FOUND AND (
    NEW.amount IS DISTINCT FROM invoice.equipment_cents/100.0 OR
    NEW.platform_fee IS DISTINCT FROM (invoice.fee_snapshot->>'fee_cents')::numeric/100 OR
    NEW.seller_payout IS DISTINCT FROM (invoice.equipment_cents-(invoice.fee_snapshot->>'fee_cents')::bigint)/100.0 OR
    NEW.tax_amount IS DISTINCT FROM invoice.tax_cents/100.0 OR
    NEW.tax_source IS DISTINCT FROM 'reviewed_invoice' OR
    NEW.tax_jurisdiction IS DISTINCT FROM invoice.tax_snapshot->>'jurisdiction'
  ) THEN RAISE EXCEPTION 'Sale amounts must match issued invoice'; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION public.guard_issued_invoice_snapshot()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF ROW(NEW.id,NEW.request_id,NEW.sale_id,NEW.listing_id,NEW.buyer_id,NEW.seller_id,NEW.invoice_number,
      NEW.currency,NEW.equipment_cents,NEW.delivery_cents,NEW.freight_cents,NEW.tax_cents,NEW.total_cents,
      NEW.seller_snapshot,NEW.buyer_snapshot,NEW.terms_snapshot,NEW.tax_snapshot,NEW.fee_snapshot,NEW.issued_at,NEW.due_at)
    IS DISTINCT FROM ROW(OLD.id,OLD.request_id,OLD.sale_id,OLD.listing_id,OLD.buyer_id,OLD.seller_id,OLD.invoice_number,
      OLD.currency,OLD.equipment_cents,OLD.delivery_cents,OLD.freight_cents,OLD.tax_cents,OLD.total_cents,
      OLD.seller_snapshot,OLD.buyer_snapshot,OLD.terms_snapshot,OLD.tax_snapshot,OLD.fee_snapshot,OLD.issued_at,OLD.due_at)
  THEN RAISE EXCEPTION 'Issued invoice terms are immutable; cancel the unpaid invoice and issue a new purchase request'; END IF;
  IF OLD.paypal_capture_id IS NOT NULL AND ROW(NEW.paypal_capture_id,NEW.paid_at,NEW.auto_disbursement_at)
    IS DISTINCT FROM ROW(OLD.paypal_capture_id,OLD.paid_at,OLD.auto_disbursement_at)
  THEN RAISE EXCEPTION 'Verified capture identity and timing are immutable'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_issued_invoice_snapshot BEFORE UPDATE ON public.sale_invoices
FOR EACH ROW EXECUTE FUNCTION public.guard_issued_invoice_snapshot();
