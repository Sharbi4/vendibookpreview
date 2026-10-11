-- Vendibook Pro: agreed-fee snapshots ------------------------------------
ALTER TABLE public.sale_transactions
  ADD COLUMN IF NOT EXISTS fee_rate_pct numeric,
  ADD COLUMN IF NOT EXISTS pro_discount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pro_fee_applied boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fee_locked_at timestamptz;

ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS host_fee_rate_pct numeric,
  ADD COLUMN IF NOT EXISTS host_platform_fee numeric,
  ADD COLUMN IF NOT EXISTS host_pro_discount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pro_fee_applied boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fee_locked_at timestamptz;

ALTER TABLE public.payment_records
  ADD COLUMN IF NOT EXISTS fee_rate_pct numeric,
  ADD COLUMN IF NOT EXISTS pro_discount_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pro_fee_applied boolean NOT NULL DEFAULT false;

ALTER TABLE public.seller_payables
  ADD COLUMN IF NOT EXISTS fee_rate_pct numeric,
  ADD COLUMN IF NOT EXISTS pro_discount_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pro_fee_applied boolean NOT NULL DEFAULT false;

-- Vendibook Pro: monthly Featured Boost credit ----------------------------
CREATE TABLE IF NOT EXISTS public.pro_boost_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subscription_id uuid,
  paypal_subscription_id text,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'available',
  used_at timestamptz,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  purchase_id uuid REFERENCES public.monetization_purchases(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'vendibook_pro',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pro_boost_credits_status_chk CHECK (status IN ('available', 'used', 'expired'))
);

-- One credit per member per billing period: webhook retries are a no-op.
CREATE UNIQUE INDEX IF NOT EXISTS pro_boost_credits_user_period_uidx
  ON public.pro_boost_credits (user_id, period_start);

CREATE INDEX IF NOT EXISTS pro_boost_credits_user_status_idx
  ON public.pro_boost_credits (user_id, status, period_end);

GRANT SELECT ON public.pro_boost_credits TO authenticated;
GRANT ALL ON public.pro_boost_credits TO service_role;

ALTER TABLE public.pro_boost_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their own boost credits"
  ON public.pro_boost_credits FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all boost credits"
  ON public.pro_boost_credits FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER pro_boost_credits_set_updated_at
  BEFORE UPDATE ON public.pro_boost_credits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();