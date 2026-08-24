ALTER TABLE public.sale_transactions
  ADD COLUMN IF NOT EXISTS tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_rate_pct numeric(7,4),
  ADD COLUMN IF NOT EXISTS tax_source text,
  ADD COLUMN IF NOT EXISTS tax_jurisdiction text;

ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_rate_pct numeric(7,4),
  ADD COLUMN IF NOT EXISTS tax_source text,
  ADD COLUMN IF NOT EXISTS tax_jurisdiction text;

ALTER TABLE public.monetization_purchases
  ADD COLUMN IF NOT EXISTS tax_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_rate_pct numeric(7,4),
  ADD COLUMN IF NOT EXISTS tax_source text,
  ADD COLUMN IF NOT EXISTS tax_jurisdiction text;

COMMENT ON COLUMN public.sale_transactions.tax_amount IS 'Estimated sales tax collected from the buyer on top of the merchandise total. Held by Vendibook for remittance (marketplace facilitator). Never included in seller payout or commission base.';
COMMENT ON COLUMN public.booking_requests.tax_amount IS 'Estimated sales tax collected from the guest on the rental subtotal. Held by Vendibook for remittance. Never included in host payout or fee base.';
COMMENT ON COLUMN public.monetization_purchases.tax_cents IS 'Estimated sales tax collected on Vendibook-owned products/services, held for remittance.';