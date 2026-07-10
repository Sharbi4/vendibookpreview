
-- Transaction Terms Snapshot: immutable record of what the buyer agreed to
CREATE TABLE public.transaction_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.booking_requests(id) ON DELETE SET NULL,
  sale_transaction_id uuid REFERENCES public.sale_transactions(id) ON DELETE SET NULL,
  buyer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL,
  total_cents integer NOT NULL,
  subtotal_cents integer NOT NULL,
  deposit_cents integer NOT NULL DEFAULT 0,
  commission_cents integer NOT NULL DEFAULT 0,
  renter_fee_cents integer NOT NULL DEFAULT 0,
  terms_version text NOT NULL DEFAULT 'v1',
  previous_terms_id uuid REFERENCES public.transaction_terms(id) ON DELETE SET NULL,
  stripe_session_id text,
  payment_method text NOT NULL CHECK (payment_method IN ('stripe_card','pay_in_person','offer','other')),
  transaction_mode text NOT NULL CHECK (transaction_mode IN ('rent','sale')),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.transaction_terms TO authenticated;
GRANT ALL ON public.transaction_terms TO service_role;

ALTER TABLE public.transaction_terms ENABLE ROW LEVEL SECURITY;

-- Buyer sees own snapshots
CREATE POLICY "buyer_read_own_terms"
  ON public.transaction_terms FOR SELECT TO authenticated
  USING (buyer_id = auth.uid());

-- Host sees snapshots for their own listings
CREATE POLICY "host_read_own_terms"
  ON public.transaction_terms FOR SELECT TO authenticated
  USING (host_id = auth.uid());

-- Admin sees all
CREATE POLICY "admin_read_all_terms"
  ON public.transaction_terms FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Only service_role (edge functions) may insert. Authenticated users cannot
-- insert directly — snapshots are always written server-side after price
-- calculation to preserve integrity. (No INSERT policy = blocked for
-- authenticated even with GRANT.)

CREATE INDEX idx_transaction_terms_listing ON public.transaction_terms(listing_id);
CREATE INDEX idx_transaction_terms_booking ON public.transaction_terms(booking_id);
CREATE INDEX idx_transaction_terms_sale    ON public.transaction_terms(sale_transaction_id);
CREATE INDEX idx_transaction_terms_buyer   ON public.transaction_terms(buyer_id);
CREATE INDEX idx_transaction_terms_stripe  ON public.transaction_terms(stripe_session_id);

COMMENT ON TABLE public.transaction_terms IS
  'Immutable snapshot of the pricing, fees, deposit, cancellation policy, required documents, and dates the buyer agreed to at checkout. Rendered identically in the summary card, details accordion, price modal, final review sheet, and confirmation email. New agreements create a new row and link previous_terms_id.';
