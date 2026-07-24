
-- Enum for status
DO $$ BEGIN
  CREATE TYPE public.protected_sale_status AS ENUM (
    'initiated','id_verified','agreement_signed','deposit_paid',
    'balance_authorized','handoff_scheduled','funds_released',
    'completed','disputed','cancelled','refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.protected_sale_handoff_mode AS ENUM ('pickup','delivery');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1) protected_sales
CREATE TABLE IF NOT EXISTS public.protected_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_transaction_id UUID NOT NULL REFERENCES public.sale_transactions(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE RESTRICT,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status public.protected_sale_status NOT NULL DEFAULT 'initiated',

  sale_price_cents INTEGER NOT NULL CHECK (sale_price_cents > 0),
  protection_fee_cents INTEGER NOT NULL CHECK (protection_fee_cents >= 0),
  deposit_cents INTEGER NOT NULL CHECK (deposit_cents >= 0),
  balance_cents INTEGER NOT NULL CHECK (balance_cents >= 0),

  buyer_identity_verified_at TIMESTAMPTZ,
  seller_identity_verified_at TIMESTAMPTZ,

  terms_id UUID REFERENCES public.transaction_terms(id) ON DELETE SET NULL,
  agreement_snapshot JSONB,
  agreement_signed_at TIMESTAMPTZ,
  agreement_signer_ip TEXT,

  deposit_stripe_session_id TEXT,
  deposit_paid_at TIMESTAMPTZ,
  balance_stripe_payment_intent_id TEXT,
  balance_authorized_at TIMESTAMPTZ,

  handoff_mode public.protected_sale_handoff_mode,
  handoff_location JSONB,
  handoff_scheduled_at TIMESTAMPTZ,
  handoff_confirmed_by_buyer_at TIMESTAMPTZ,
  handoff_confirmed_by_seller_at TIMESTAMPTZ,

  funds_released_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sale_transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_protected_sales_buyer ON public.protected_sales(buyer_id);
CREATE INDEX IF NOT EXISTS idx_protected_sales_seller ON public.protected_sales(seller_id);
CREATE INDEX IF NOT EXISTS idx_protected_sales_status ON public.protected_sales(status);

GRANT SELECT ON public.protected_sales TO authenticated;
GRANT ALL ON public.protected_sales TO service_role;

ALTER TABLE public.protected_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties can view their protected sale"
  ON public.protected_sales FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.is_admin(auth.uid()));

-- No INSERT/UPDATE/DELETE policies for authenticated => only service_role can mutate.

CREATE TRIGGER trg_protected_sales_updated_at
  BEFORE UPDATE ON public.protected_sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) protected_sale_events (audit log)
CREATE TABLE IF NOT EXISTS public.protected_sale_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protected_sale_id UUID NOT NULL REFERENCES public.protected_sales(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT,
  ip TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pse_sale ON public.protected_sale_events(protected_sale_id);

GRANT SELECT ON public.protected_sale_events TO authenticated;
GRANT ALL ON public.protected_sale_events TO service_role;

ALTER TABLE public.protected_sale_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties can view protected sale events"
  ON public.protected_sale_events FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.protected_sales ps
      WHERE ps.id = protected_sale_events.protected_sale_id
        AND (ps.buyer_id = auth.uid() OR ps.seller_id = auth.uid())
    )
  );

-- 3) Status transition guard
CREATE OR REPLACE FUNCTION public.enforce_protected_sale_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  rank_old INT;
  rank_new INT;
  order_map CONSTANT TEXT[] := ARRAY[
    'initiated','id_verified','agreement_signed','deposit_paid',
    'balance_authorized','handoff_scheduled','funds_released','completed'
  ];
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Terminal side-branches always allowed
  IF NEW.status IN ('cancelled','disputed','refunded') THEN
    RETURN NEW;
  END IF;

  rank_old := COALESCE(array_position(order_map, OLD.status::text), 0);
  rank_new := COALESCE(array_position(order_map, NEW.status::text), 0);

  IF rank_new < rank_old THEN
    RAISE EXCEPTION 'Protected sale status cannot regress from % to %', OLD.status, NEW.status;
  END IF;

  IF NEW.status = 'agreement_signed'
     AND (NEW.buyer_identity_verified_at IS NULL OR NEW.seller_identity_verified_at IS NULL) THEN
    RAISE EXCEPTION 'Both parties must be identity-verified before signing agreement';
  END IF;

  IF NEW.status = 'funds_released'
     AND (NEW.handoff_confirmed_by_buyer_at IS NULL OR NEW.handoff_confirmed_by_seller_at IS NULL) THEN
    RAISE EXCEPTION 'Both parties must confirm handoff before funds release';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_protected_sale_status ON public.protected_sales;
CREATE TRIGGER trg_enforce_protected_sale_status
  BEFORE UPDATE OF status ON public.protected_sales
  FOR EACH ROW EXECUTE FUNCTION public.enforce_protected_sale_status();
