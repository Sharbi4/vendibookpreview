DO $$ BEGIN
  CREATE TYPE public.concierge_order_status AS ENUM (
    'payment_required','intake_not_started','intake_in_progress','information_needed',
    'listing_being_created','ready_for_seller_review','revision_requested',
    'approved_for_publication','published','canceled','refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.listing_concierge_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  is_available boolean NOT NULL DEFAULT true,
  price_cents integer NOT NULL DEFAULT 14900,
  currency text NOT NULL DEFAULT 'USD',
  turnaround_business_days integer NOT NULL DEFAULT 2,
  included_revisions integer NOT NULL DEFAULT 1,
  specialist_contact_enabled boolean NOT NULL DEFAULT false,
  terms_version text NOT NULL DEFAULT 'concierge-terms-v1',
  copy jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.listing_concierge_config TO anon, authenticated;
GRANT ALL ON public.listing_concierge_config TO service_role;
ALTER TABLE public.listing_concierge_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads concierge config" ON public.listing_concierge_config
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage concierge config" ON public.listing_concierge_config
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
INSERT INTO public.listing_concierge_config (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.listing_concierge_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  config_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  price_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status public.concierge_order_status NOT NULL DEFAULT 'payment_required',
  idempotency_key text NOT NULL,
  payment_record_id uuid REFERENCES public.payment_records(id) ON DELETE SET NULL,
  paypal_order_id text,
  paypal_capture_id text,
  payment_status text NOT NULL DEFAULT 'unpaid',
  refund_status text,
  refunded_cents integer NOT NULL DEFAULT 0,
  paid_at timestamptz,
  intake jsonb NOT NULL DEFAULT '{}'::jsonb,
  intake_version integer NOT NULL DEFAULT 1,
  intake_submitted_at timestamptz,
  uploads jsonb NOT NULL DEFAULT '[]'::jsonb,
  specialist_contact_requested boolean NOT NULL DEFAULT false,
  contact_method text,
  contact_availability text,
  assigned_reviewer_id uuid,
  internal_notes text,
  revisions_included integer NOT NULL DEFAULT 1,
  revision_count integer NOT NULL DEFAULT 0,
  reviewer_completed_at timestamptz,
  reviewer_completed_by uuid,
  draft_delivered_at timestamptz,
  revision_requested_at timestamptz,
  approved_at timestamptz,
  published_at timestamptz,
  canceled_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_concierge_orders_idem
  ON public.listing_concierge_orders(user_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_concierge_orders_user ON public.listing_concierge_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_concierge_orders_status ON public.listing_concierge_orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_concierge_orders_paypal ON public.listing_concierge_orders(paypal_order_id);
GRANT SELECT, INSERT, UPDATE ON public.listing_concierge_orders TO authenticated;
GRANT ALL ON public.listing_concierge_orders TO service_role;
ALTER TABLE public.listing_concierge_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner reads own concierge orders" ON public.listing_concierge_orders
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "admins manage concierge orders" ON public.listing_concierge_orders
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.listing_concierge_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.listing_concierge_orders(id) ON DELETE CASCADE,
  author_id uuid,
  author_role text NOT NULL DEFAULT 'seller',
  kind text NOT NULL DEFAULT 'message',
  body text NOT NULL,
  internal boolean NOT NULL DEFAULT false,
  answered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_concierge_messages_order ON public.listing_concierge_messages(order_id, created_at);
GRANT SELECT, INSERT ON public.listing_concierge_messages TO authenticated;
GRANT ALL ON public.listing_concierge_messages TO service_role;
ALTER TABLE public.listing_concierge_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants read concierge messages" ON public.listing_concierge_messages
  FOR SELECT TO authenticated USING (
    public.is_admin(auth.uid())
    OR (internal = false AND EXISTS (
      SELECT 1 FROM public.listing_concierge_orders o
      WHERE o.id = order_id AND o.user_id = auth.uid()))
  );
CREATE POLICY "participants write concierge messages" ON public.listing_concierge_messages
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin(auth.uid())
    OR (internal = false AND author_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.listing_concierge_orders o
      WHERE o.id = order_id AND o.user_id = auth.uid()))
  );
CREATE POLICY "admins manage concierge messages" ON public.listing_concierge_messages
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.listing_concierge_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.listing_concierge_orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  agreement_kind text NOT NULL,
  agreement_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);
CREATE INDEX IF NOT EXISTS idx_concierge_agreements_order ON public.listing_concierge_agreements(order_id);
GRANT SELECT ON public.listing_concierge_agreements TO authenticated;
GRANT ALL ON public.listing_concierge_agreements TO service_role;
ALTER TABLE public.listing_concierge_agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner reads own concierge agreements" ON public.listing_concierge_agreements
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "admins manage concierge agreements" ON public.listing_concierge_agreements
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.listing_concierge_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.listing_concierge_orders(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_role text NOT NULL DEFAULT 'system',
  code text NOT NULL,
  from_status public.concierge_order_status,
  to_status public.concierge_order_status,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_concierge_events_order ON public.listing_concierge_events(order_id, created_at);
GRANT SELECT ON public.listing_concierge_events TO authenticated;
GRANT ALL ON public.listing_concierge_events TO service_role;
ALTER TABLE public.listing_concierge_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner reads own concierge events" ON public.listing_concierge_events
  FOR SELECT TO authenticated USING (
    public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.listing_concierge_orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );
CREATE POLICY "admins manage concierge events" ON public.listing_concierge_events
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_concierge_orders_updated BEFORE UPDATE ON public.listing_concierge_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_concierge_config_updated BEFORE UPDATE ON public.listing_concierge_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();