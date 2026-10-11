ALTER TABLE public.freight_requests
  ADD COLUMN IF NOT EXISTS quote_amount_cents integer,
  ADD COLUMN IF NOT EXISTS quote_notes text,
  ADD COLUMN IF NOT EXISTS quote_transit_days text,
  ADD COLUMN IF NOT EXISTS quoted_at timestamptz,
  ADD COLUMN IF NOT EXISTS quoted_by uuid;