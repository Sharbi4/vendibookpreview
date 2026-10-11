alter table public.freight_requests
  add column if not exists paypal_invoice_id text,
  add column if not exists paypal_invoice_url text,
  add column if not exists quote_sent_at timestamptz;