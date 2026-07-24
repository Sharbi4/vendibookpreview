
-- =========================================================
-- Buyer service requests
-- =========================================================
CREATE TABLE public.buyer_service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  product_key TEXT NOT NULL,                 -- e.g. 'buyer_readiness_pass', 'listing_purchase_review'
  purchase_id UUID REFERENCES public.monetization_purchases(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'awaiting_payment',
    -- awaiting_payment | in_queue | in_review | awaiting_buyer | completed | cancelled | refunded
  intake JSONB NOT NULL DEFAULT '{}'::jsonb,
  deliverable JSONB NOT NULL DEFAULT '{}'::jsonb,
  admin_notes TEXT,
  fulfilled_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_buyer_service_requests_buyer ON public.buyer_service_requests(buyer_id);
CREATE INDEX idx_buyer_service_requests_status ON public.buyer_service_requests(status);
CREATE INDEX idx_buyer_service_requests_listing ON public.buyer_service_requests(listing_id);

GRANT SELECT, INSERT, UPDATE ON public.buyer_service_requests TO authenticated;
GRANT ALL ON public.buyer_service_requests TO service_role;

ALTER TABLE public.buyer_service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buyers view own service requests"
  ON public.buyer_service_requests FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR public.is_admin(auth.uid()));

CREATE POLICY "buyers create own service requests"
  ON public.buyer_service_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "buyers update own intake, admins full"
  ON public.buyer_service_requests FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = buyer_id OR public.is_admin(auth.uid()));

CREATE TRIGGER trg_buyer_service_requests_updated_at
  BEFORE UPDATE ON public.buyer_service_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Service partners (directory)
-- =========================================================
CREATE TABLE public.service_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  category TEXT NOT NULL,          -- financing | insurance | inspection | transport | kitchen | commissary | builder | wrap | pos | fire | cleaning | repair | other
  logo_url TEXT,
  description TEXT,
  service_area TEXT,
  website_url TEXT,
  phone TEXT,
  email TEXT,
  contact_form_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_sponsored BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_service_partners_category ON public.service_partners(category);
CREATE INDEX idx_service_partners_active ON public.service_partners(is_active);

GRANT SELECT ON public.service_partners TO anon, authenticated;
GRANT ALL ON public.service_partners TO service_role;

ALTER TABLE public.service_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public reads active partners"
  ON public.service_partners FOR SELECT
  USING (is_active = TRUE OR public.is_admin(auth.uid()));

CREATE POLICY "admins manage partners"
  ON public.service_partners FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_service_partners_updated_at
  BEFORE UPDATE ON public.service_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Partner leads
-- =========================================================
CREATE TABLE public.partner_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  partner_id UUID REFERENCES public.service_partners(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  service TEXT NOT NULL,
  location TEXT,
  budget TEXT,
  timeline TEXT,
  notes TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  consent_granted BOOLEAN NOT NULL DEFAULT FALSE,
  consent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'submitted',   -- submitted | contacted | converted | closed | invalid
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_partner_leads_user ON public.partner_leads(user_id);
CREATE INDEX idx_partner_leads_partner ON public.partner_leads(partner_id);
CREATE INDEX idx_partner_leads_status ON public.partner_leads(status);

GRANT SELECT, INSERT ON public.partner_leads TO authenticated;
GRANT ALL ON public.partner_leads TO service_role;

ALTER TABLE public.partner_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own leads"
  ON public.partner_leads FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "users create leads with consent"
  ON public.partner_leads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND consent_granted = TRUE);

CREATE POLICY "admins manage leads"
  ON public.partner_leads FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_partner_leads_updated_at
  BEFORE UPDATE ON public.partner_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Host subscriptions
-- =========================================================
CREATE TABLE public.host_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL,               -- 'host_starter' | 'host_growth' | 'host_operator'
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  status TEXT NOT NULL DEFAULT 'incomplete',
    -- incomplete | trialing | active | past_due | canceled | unpaid | paused
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  last_error JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_host_subscriptions_user ON public.host_subscriptions(user_id);
CREATE INDEX idx_host_subscriptions_status ON public.host_subscriptions(status);

GRANT SELECT ON public.host_subscriptions TO authenticated;
GRANT ALL ON public.host_subscriptions TO service_role;

ALTER TABLE public.host_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own host subscription"
  ON public.host_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "admins manage host subscriptions"
  ON public.host_subscriptions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_host_subscriptions_updated_at
  BEFORE UPDATE ON public.host_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Permit concierge requests
-- =========================================================
CREATE TABLE public.permit_concierge_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  roadmap_id UUID REFERENCES public.saved_permit_roadmaps(id) ON DELETE SET NULL,
  purchase_id UUID REFERENCES public.monetization_purchases(id) ON DELETE SET NULL,
  service_level TEXT NOT NULL DEFAULT 'permit_path_concierge',
    -- 'permit_path_plus' | 'permit_path_concierge'
  status TEXT NOT NULL DEFAULT 'awaiting_intake',
    -- awaiting_intake | in_review | awaiting_user | completed | cancelled
  intake JSONB NOT NULL DEFAULT '{}'::jsonb,
  deliverable JSONB NOT NULL DEFAULT '{}'::jsonb,
  admin_notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_permit_concierge_user ON public.permit_concierge_requests(user_id);
CREATE INDEX idx_permit_concierge_status ON public.permit_concierge_requests(status);

GRANT SELECT, INSERT, UPDATE ON public.permit_concierge_requests TO authenticated;
GRANT ALL ON public.permit_concierge_requests TO service_role;

ALTER TABLE public.permit_concierge_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own concierge requests"
  ON public.permit_concierge_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "users create own concierge intake"
  ON public.permit_concierge_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own intake, admins manage all"
  ON public.permit_concierge_requests FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE TRIGGER trg_permit_concierge_updated_at
  BEFORE UPDATE ON public.permit_concierge_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
