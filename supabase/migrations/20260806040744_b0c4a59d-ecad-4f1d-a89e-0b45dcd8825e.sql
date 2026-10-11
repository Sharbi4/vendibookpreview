
DO $$ BEGIN
  CREATE TYPE public.listing_readiness_level AS ENUM ('published','buyer_ready','highly_detailed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.listing_service_order_status AS ENUM ('awaiting_payment','paid','intake','in_progress','questions','revision','seller_review','approved','published','cancelled','refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.listing_specs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL UNIQUE REFERENCES public.listings(id) ON DELETE CASCADE,
  cooking jsonb NOT NULL DEFAULT '{}'::jsonb,
  refrigeration jsonb NOT NULL DEFAULT '{}'::jsonb,
  electrical jsonb NOT NULL DEFAULT '{}'::jsonb,
  propane jsonb NOT NULL DEFAULT '{}'::jsonb,
  plumbing jsonb NOT NULL DEFAULT '{}'::jsonb,
  hood jsonb NOT NULL DEFAULT '{}'::jsonb,
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  mechanical jsonb NOT NULL DEFAULT '{}'::jsonb,
  inspections jsonb NOT NULL DEFAULT '{}'::jsonb,
  inclusions jsonb NOT NULL DEFAULT '{}'::jsonb,
  viewing jsonb NOT NULL DEFAULT '{}'::jsonb,
  site jsonb NOT NULL DEFAULT '{}'::jsonb,
  confirmed_sections text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.listing_rental_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL UNIQUE REFERENCES public.listings(id) ON DELETE CASCADE,
  terms jsonb NOT NULL DEFAULT '{}'::jsonb,
  confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.listing_completeness (
  listing_id uuid PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  readiness_level public.listing_readiness_level NOT NULL DEFAULT 'published',
  missing_sections text[] NOT NULL DEFAULT ARRAY[]::text[],
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.listing_spec_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  section text NOT NULL,
  field text NOT NULL,
  suggested_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'ai',
  status text NOT NULL DEFAULT 'suggested',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.listing_service_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  buyer_user_id uuid NOT NULL,
  product_slug text NOT NULL,
  purchase_id uuid REFERENCES public.monetization_purchases(id) ON DELETE SET NULL,
  status public.listing_service_order_status NOT NULL DEFAULT 'awaiting_payment',
  intake jsonb NOT NULL DEFAULT '{}'::jsonb,
  revision_count integer NOT NULL DEFAULT 0,
  admin_user_id uuid,
  turnaround_hours integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  published_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.listing_service_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.listing_service_orders(id) ON DELETE CASCADE,
  sender_user_id uuid,
  sender_role text NOT NULL DEFAULT 'seller',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_specs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_rental_terms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_completeness TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_spec_suggestions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_service_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_service_messages TO authenticated;
GRANT SELECT ON public.listing_specs TO anon;
GRANT SELECT ON public.listing_rental_terms TO anon;
GRANT SELECT ON public.listing_completeness TO anon;
GRANT ALL ON public.listing_specs TO service_role;
GRANT ALL ON public.listing_rental_terms TO service_role;
GRANT ALL ON public.listing_completeness TO service_role;
GRANT ALL ON public.listing_spec_suggestions TO service_role;
GRANT ALL ON public.listing_service_orders TO service_role;
GRANT ALL ON public.listing_service_messages TO service_role;

ALTER TABLE public.listing_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_rental_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_completeness ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_spec_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_service_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner manages listing specs" ON public.listing_specs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.host_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.host_id = auth.uid()));
CREATE POLICY "public reads visible listing specs" ON public.listing_specs FOR SELECT TO anon, authenticated
  USING (public.is_listing_publicly_visible(listing_id));

CREATE POLICY "owner manages rental terms" ON public.listing_rental_terms FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.host_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.host_id = auth.uid()));
CREATE POLICY "public reads visible rental terms" ON public.listing_rental_terms FOR SELECT TO anon, authenticated
  USING (public.is_listing_publicly_visible(listing_id));

CREATE POLICY "owner manages completeness" ON public.listing_completeness FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.host_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.host_id = auth.uid()));
CREATE POLICY "public reads visible completeness" ON public.listing_completeness FOR SELECT TO anon, authenticated
  USING (public.is_listing_publicly_visible(listing_id));

CREATE POLICY "owner manages spec suggestions" ON public.listing_spec_suggestions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.host_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.host_id = auth.uid()));

CREATE POLICY "buyer reads own service orders" ON public.listing_service_orders FOR SELECT TO authenticated
  USING (buyer_user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "buyer updates own service orders" ON public.listing_service_orders FOR UPDATE TO authenticated
  USING (buyer_user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (buyer_user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "admins manage service orders" ON public.listing_service_orders FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "participants read service messages" ON public.listing_service_messages FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.listing_service_orders o WHERE o.id = order_id AND o.buyer_user_id = auth.uid()));
CREATE POLICY "participants write service messages" ON public.listing_service_messages FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.listing_service_orders o WHERE o.id = order_id AND o.buyer_user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_listing_specs_listing ON public.listing_specs(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_completeness_level ON public.listing_completeness(readiness_level);
CREATE INDEX IF NOT EXISTS idx_listing_service_orders_status ON public.listing_service_orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listing_spec_suggestions_listing ON public.listing_spec_suggestions(listing_id, status);
CREATE INDEX IF NOT EXISTS idx_listings_host_drafts ON public.listings(host_id) WHERE status = 'draft';

CREATE TRIGGER trg_listing_specs_updated BEFORE UPDATE ON public.listing_specs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_listing_rental_terms_updated BEFORE UPDATE ON public.listing_rental_terms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_listing_service_orders_updated BEFORE UPDATE ON public.listing_service_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
