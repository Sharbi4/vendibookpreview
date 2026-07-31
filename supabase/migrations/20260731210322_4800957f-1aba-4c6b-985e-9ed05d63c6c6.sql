-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.payment_provider AS ENUM ('stripe','paypal','manual','dwolla_future');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.paypal_payment_status AS ENUM (
    'created','approved','pending','completed','declined','failed',
    'cancelled','partially_refunded','refunded','reversed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.seller_payout_status AS ENUM (
    'awaiting_payment_confirmation','pending_release','eligible_for_review',
    'payout_on_hold','payout_approved','payout_processing','payout_completed',
    'payout_failed','partially_refunded','fully_refunded','disputed',
    'reversed','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ PAYMENT RECORDS ============
CREATE TABLE IF NOT EXISTS public.payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  provider public.payment_provider NOT NULL DEFAULT 'paypal',
  transaction_type TEXT NOT NULL,
  sale_transaction_id UUID REFERENCES public.sale_transactions(id) ON DELETE SET NULL,
  booking_request_id UUID REFERENCES public.booking_requests(id) ON DELETE SET NULL,
  monetization_purchase_id UUID REFERENCES public.monetization_purchases(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  buyer_id UUID,
  seller_id UUID,
  buyer_email TEXT,
  paypal_order_id TEXT UNIQUE,
  paypal_capture_id TEXT UNIQUE,
  paypal_payer_id TEXT,
  payment_source TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  gross_amount_cents INTEGER NOT NULL DEFAULT 0,
  platform_fee_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  deposit_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  refunded_cents INTEGER NOT NULL DEFAULT 0,
  seller_proceeds_cents INTEGER NOT NULL DEFAULT 0,
  payment_status public.paypal_payment_status NOT NULL DEFAULT 'created',
  internal_status TEXT NOT NULL DEFAULT 'initiated',
  dispute_status TEXT NOT NULL DEFAULT 'none',
  idempotency_key TEXT UNIQUE,
  fee_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_error JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  captured_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  last_reconciled_at TIMESTAMPTZ,
  CONSTRAINT payment_records_amounts_nonneg CHECK (
    gross_amount_cents >= 0 AND platform_fee_cents >= 0 AND refunded_cents >= 0
  )
);
GRANT SELECT ON public.payment_records TO authenticated;
GRANT ALL ON public.payment_records TO service_role;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view their payment records"
  ON public.payment_records FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_payment_records_buyer ON public.payment_records(buyer_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_seller ON public.payment_records(seller_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_status ON public.payment_records(payment_status);

-- ============ LEDGER ============
CREATE TABLE IF NOT EXISTS public.payment_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_record_id UUID NOT NULL REFERENCES public.payment_records(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  direction TEXT NOT NULL DEFAULT 'credit',
  description TEXT,
  external_reference TEXT,
  dedupe_key TEXT UNIQUE,
  actor_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_ledger_entries TO authenticated;
GRANT ALL ON public.payment_ledger_entries TO service_role;
ALTER TABLE public.payment_ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view ledger"
  ON public.payment_ledger_entries FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_ledger_payment ON public.payment_ledger_entries(payment_record_id);

-- ============ SELLER PAYABLES ============
CREATE TABLE IF NOT EXISTS public.seller_payables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_record_id UUID NOT NULL UNIQUE REFERENCES public.payment_records(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL,
  buyer_id UUID,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  gross_collected_cents INTEGER NOT NULL DEFAULT 0,
  platform_fee_cents INTEGER NOT NULL DEFAULT 0,
  adjustments_cents INTEGER NOT NULL DEFAULT 0,
  refunded_cents INTEGER NOT NULL DEFAULT 0,
  net_payout_cents INTEGER NOT NULL DEFAULT 0,
  status public.seller_payout_status NOT NULL DEFAULT 'awaiting_payment_confirmation',
  paid_at TIMESTAMPTZ,
  release_due_at TIMESTAMPTZ,
  payout_eligible_at TIMESTAMPTZ,
  hold_reason TEXT,
  dispute_status TEXT NOT NULL DEFAULT 'none',
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  payout_method TEXT NOT NULL DEFAULT 'dwolla_ach',
  payout_provider public.payment_provider NOT NULL DEFAULT 'dwolla_future',
  external_payout_reference TEXT,
  dwolla_transfer_id TEXT,
  payout_idempotency_key TEXT UNIQUE,
  payout_approved_at TIMESTAMPTZ,
  payout_approved_by UUID,
  payout_completed_at TIMESTAMPTZ,
  failure_reason TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT seller_payables_net_nonneg CHECK (net_payout_cents >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_seller_payables_transfer
  ON public.seller_payables(dwolla_transfer_id) WHERE dwolla_transfer_id IS NOT NULL;

GRANT SELECT ON public.seller_payables TO authenticated;
GRANT ALL ON public.seller_payables TO service_role;
ALTER TABLE public.seller_payables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers view own payables"
  ON public.seller_payables FOR SELECT TO authenticated
  USING (auth.uid() = seller_id OR public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_payables_seller ON public.seller_payables(seller_id);
CREATE INDEX IF NOT EXISTS idx_payables_status ON public.seller_payables(status);

-- ============ PAYOUT AUDIT ============
CREATE TABLE IF NOT EXISTS public.payout_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payable_id UUID NOT NULL REFERENCES public.seller_payables(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_id UUID,
  from_status public.seller_payout_status,
  to_status public.seller_payout_status,
  note TEXT,
  external_reference TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payout_actions TO authenticated;
GRANT ALL ON public.payout_actions TO service_role;
ALTER TABLE public.payout_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view payout actions"
  ON public.payout_actions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- ============ WEBHOOK EVENTS ============
CREATE TABLE IF NOT EXISTS public.paypal_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  processed BOOLEAN NOT NULL DEFAULT false,
  processing_error TEXT,
  raw_event JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
GRANT ALL ON public.paypal_webhook_events TO service_role;
ALTER TABLE public.paypal_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only webhook events"
  ON public.paypal_webhook_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============ PAYPAL SUBSCRIPTIONS ============
CREATE TABLE IF NOT EXISTS public.paypal_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tier TEXT NOT NULL,
  billing_interval TEXT NOT NULL DEFAULT 'month',
  paypal_product_id TEXT,
  paypal_plan_id TEXT NOT NULL,
  paypal_subscription_id TEXT NOT NULL UNIQUE,
  paypal_subscriber_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  recurring_amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  start_time TIMESTAMPTZ,
  next_billing_time TIMESTAMPTZ,
  last_payment_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  consent_id UUID,
  last_webhook_event_id TEXT,
  last_reconciled_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_paypal_sub_active_user
  ON public.paypal_subscriptions(user_id)
  WHERE status IN ('active','approval_pending','pending','suspended','past_due');

GRANT SELECT ON public.paypal_subscriptions TO authenticated;
GRANT ALL ON public.paypal_subscriptions TO service_role;
ALTER TABLE public.paypal_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own paypal subscription"
  ON public.paypal_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- ============ PLAN MAPPINGS ============
CREATE TABLE IF NOT EXISTS public.paypal_plan_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL,
  billing_interval TEXT NOT NULL DEFAULT 'month',
  paypal_product_id TEXT,
  paypal_plan_id TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  environment TEXT NOT NULL DEFAULT 'sandbox',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tier, billing_interval, environment)
);
GRANT SELECT ON public.paypal_plan_mappings TO authenticated;
GRANT ALL ON public.paypal_plan_mappings TO service_role;
ALTER TABLE public.paypal_plan_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can read plan mappings"
  ON public.paypal_plan_mappings FOR SELECT TO authenticated USING (is_active);
CREATE POLICY "Admins manage plan mappings"
  ON public.paypal_plan_mappings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ PROVIDER LABELS ON EXISTING TABLES ============
ALTER TABLE public.sale_transactions
  ADD COLUMN IF NOT EXISTS payment_provider public.payment_provider NOT NULL DEFAULT 'stripe';
ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS payment_provider public.payment_provider NOT NULL DEFAULT 'stripe';
ALTER TABLE public.monetization_purchases
  ADD COLUMN IF NOT EXISTS payment_provider public.payment_provider NOT NULL DEFAULT 'stripe';
ALTER TABLE public.host_subscriptions
  ADD COLUMN IF NOT EXISTS payment_provider public.payment_provider NOT NULL DEFAULT 'stripe';
ALTER TABLE public.host_subscriptions
  ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT;

-- ============ TIMESTAMP TRIGGERS ============
CREATE TRIGGER trg_payment_records_updated BEFORE UPDATE ON public.payment_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_seller_payables_updated BEFORE UPDATE ON public.seller_payables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_paypal_subscriptions_updated BEFORE UPDATE ON public.paypal_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_paypal_plan_mappings_updated BEFORE UPDATE ON public.paypal_plan_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ DOUBLE-PAYOUT GUARD ============
CREATE OR REPLACE FUNCTION public.enforce_payable_no_double_payout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'payout_completed' AND NEW.status <> 'payout_completed'
     AND NEW.status <> 'reversed' THEN
    RAISE EXCEPTION 'A completed payout cannot be re-opened (only reversal is allowed)';
  END IF;
  IF NEW.status = 'payout_completed'
     AND OLD.status <> 'payout_completed'
     AND (NEW.external_payout_reference IS NULL OR length(trim(NEW.external_payout_reference)) = 0)
     AND NEW.dwolla_transfer_id IS NULL THEN
    RAISE EXCEPTION 'A payout cannot be completed without an external transfer reference';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payable_no_double_payout
  BEFORE UPDATE ON public.seller_payables
  FOR EACH ROW EXECUTE FUNCTION public.enforce_payable_no_double_payout();