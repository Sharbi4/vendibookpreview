-- 1. Append-only payment audit trail
CREATE TABLE public.payment_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID,
  actor_role TEXT,
  actor_ip TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  provider TEXT,
  reference TEXT,
  capture_id TEXT,
  refund_id TEXT,
  payout_id TEXT,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_audit_entity ON public.payment_audit_log (entity_type, entity_id);
CREATE INDEX idx_payment_audit_created ON public.payment_audit_log (created_at DESC);
CREATE INDEX idx_payment_audit_reference ON public.payment_audit_log (reference);

GRANT SELECT ON public.payment_audit_log TO authenticated;
GRANT ALL ON public.payment_audit_log TO service_role;
ALTER TABLE public.payment_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read payment audit log"
  ON public.payment_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Immutability: no updates or deletes from any non-service role.
CREATE OR REPLACE FUNCTION public.payment_audit_log_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'payment_audit_log is append-only';
END;
$$;

CREATE TRIGGER trg_payment_audit_log_no_update
  BEFORE UPDATE OR DELETE ON public.payment_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.payment_audit_log_immutable();

-- 2. Product catalog fields for PayPal
ALTER TABLE public.monetization_products
  ADD COLUMN IF NOT EXISTS paypal_product_id TEXT,
  ADD COLUMN IF NOT EXISTS is_taxable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- 3. Per-interval recurring plans
CREATE TABLE public.monetization_product_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.monetization_products(id) ON DELETE CASCADE,
  billing_interval TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  trial_days INTEGER,
  provider TEXT NOT NULL DEFAULT 'paypal',
  environment TEXT NOT NULL DEFAULT 'live',
  paypal_plan_id TEXT,
  external_status TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT monetization_product_plans_interval_chk
    CHECK (billing_interval IN ('monthly','quarterly','annual')),
  CONSTRAINT monetization_product_plans_unique
    UNIQUE (product_id, billing_interval, provider, environment)
);

CREATE INDEX idx_product_plans_product ON public.monetization_product_plans (product_id);

GRANT SELECT ON public.monetization_product_plans TO anon;
GRANT SELECT ON public.monetization_product_plans TO authenticated;
GRANT ALL ON public.monetization_product_plans TO service_role;
ALTER TABLE public.monetization_product_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
  ON public.monetization_product_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage plans"
  ON public.monetization_product_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_product_plans_updated_at
  BEFORE UPDATE ON public.monetization_product_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();