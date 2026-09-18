CREATE TABLE IF NOT EXISTS public.paypal_api_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_name TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'sandbox',
  request_headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  request_body JSONB,
  response_status INTEGER,
  response_body JSONB,
  paypal_debug_id TEXT,
  latency_ms INTEGER,
  seller_id UUID,
  order_id TEXT,
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.paypal_api_logs TO authenticated;
GRANT ALL ON public.paypal_api_logs TO service_role;

ALTER TABLE public.paypal_api_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read paypal api logs"
ON public.paypal_api_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS paypal_api_logs_created_idx ON public.paypal_api_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS paypal_api_logs_call_idx ON public.paypal_api_logs (call_name, created_at DESC);
CREATE INDEX IF NOT EXISTS paypal_api_logs_debug_idx ON public.paypal_api_logs (paypal_debug_id);

CREATE OR REPLACE FUNCTION public.purge_paypal_api_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed integer;
BEGIN
  DELETE FROM public.paypal_api_logs WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.purge_paypal_api_logs() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_paypal_api_logs() TO service_role;

ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS payer_email TEXT;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS shipping_address JSONB;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS billing_address JSONB;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS order_items JSONB;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS paypal_tracking JSONB;

ALTER TABLE public.seller_paypal_accounts ADD COLUMN IF NOT EXISTS acdc_vetting_status TEXT;
ALTER TABLE public.seller_paypal_accounts ADD COLUMN IF NOT EXISTS vaulting_status TEXT;
ALTER TABLE public.seller_paypal_accounts ADD COLUMN IF NOT EXISTS capabilities JSONB;