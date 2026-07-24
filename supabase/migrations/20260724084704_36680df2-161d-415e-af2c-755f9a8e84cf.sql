-- ============================================================
-- Phase 1 Monetization Catalog: products, purchases, promotions, discounts
-- ============================================================

-- Enums --------------------------------------------------------
CREATE TYPE public.monetization_product_category AS ENUM (
  'listing_upgrade',
  'seller_service',
  'buyer_service',
  'protected_sale',
  'host_subscription',
  'permit_upgrade',
  'partner_service',
  'promo_credit'
);

CREATE TYPE public.monetization_billing_type AS ENUM (
  'one_time',
  'recurring',
  'percentage',
  'custom'
);

CREATE TYPE public.monetization_purchase_status AS ENUM (
  'pending',
  'paid',
  'fulfilled',
  'refunded',
  'failed',
  'cancelled'
);

CREATE TYPE public.listing_promo_type AS ENUM (
  'featured_7',
  'featured_30',
  'top_of_search',
  'highlight',
  'motivated_seller',
  'email_campaign',
  'social_feature'
);

-- Products catalog --------------------------------------------
CREATE TABLE public.monetization_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category public.monetization_product_category NOT NULL,
  description TEXT,
  billing_type public.monetization_billing_type NOT NULL DEFAULT 'one_time',
  price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  promo_price_cents INTEGER CHECK (promo_price_cents IS NULL OR promo_price_cents >= 0),
  promo_starts_at TIMESTAMPTZ,
  promo_ends_at TIMESTAMPTZ,
  applicable_listing_types TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  refund_policy TEXT,
  duration_days INTEGER,
  promo_type public.listing_promo_type,
  display_order INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  upgrade_eligibility JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX idx_monetization_products_category_active
  ON public.monetization_products (category, is_active, display_order);

GRANT SELECT ON public.monetization_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monetization_products TO authenticated;
GRANT ALL ON public.monetization_products TO service_role;
ALTER TABLE public.monetization_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products"
  ON public.monetization_products FOR SELECT
  USING (is_active = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage products"
  ON public.monetization_products FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_monetization_products_updated_at
  BEFORE UPDATE ON public.monetization_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Purchases ---------------------------------------------------
CREATE TABLE public.monetization_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_email TEXT,
  product_id UUID NOT NULL REFERENCES public.monetization_products(id) ON DELETE RESTRICT,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_customer_id TEXT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  discount_code_id UUID,
  discount_applied_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_applied_cents >= 0),
  status public.monetization_purchase_status NOT NULL DEFAULT 'pending',
  fulfillment_status TEXT NOT NULL DEFAULT 'pending',
  fulfillment_notes TEXT,
  refund_status TEXT,
  refund_amount_cents INTEGER,
  refunded_at TIMESTAMPTZ,
  idempotency_key TEXT NOT NULL UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX idx_monetization_purchases_user
  ON public.monetization_purchases (user_id, created_at DESC);
CREATE INDEX idx_monetization_purchases_listing
  ON public.monetization_purchases (listing_id) WHERE listing_id IS NOT NULL;
CREATE INDEX idx_monetization_purchases_status
  ON public.monetization_purchases (status);
CREATE UNIQUE INDEX idx_monetization_purchases_session
  ON public.monetization_purchases (stripe_session_id) WHERE stripe_session_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE ON public.monetization_purchases TO authenticated;
GRANT ALL ON public.monetization_purchases TO service_role;
ALTER TABLE public.monetization_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own purchases"
  ON public.monetization_purchases FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users insert own pending purchases"
  ON public.monetization_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage purchases"
  ON public.monetization_purchases FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_monetization_purchases_updated_at
  BEFORE UPDATE ON public.monetization_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Listing promotions ------------------------------------------
CREATE TABLE public.listing_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.monetization_products(id) ON DELETE RESTRICT,
  purchase_id UUID NOT NULL REFERENCES public.monetization_purchases(id) ON DELETE RESTRICT,
  promo_type public.listing_promo_type NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  metrics JSONB NOT NULL DEFAULT '{"impressions":0,"views":0,"saves":0,"messages":0,"offers":0}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT listing_promotions_dates_valid CHECK (ends_at > starts_at)
);

CREATE INDEX idx_listing_promotions_listing_active
  ON public.listing_promotions (listing_id, active, ends_at);

-- Prevent overlapping same-type active promos on one listing
CREATE UNIQUE INDEX idx_listing_promotions_no_overlap
  ON public.listing_promotions (listing_id, promo_type)
  WHERE active = true;

GRANT SELECT ON public.listing_promotions TO anon;
GRANT SELECT, INSERT, UPDATE ON public.listing_promotions TO authenticated;
GRANT ALL ON public.listing_promotions TO service_role;
ALTER TABLE public.listing_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active promotions"
  ON public.listing_promotions FOR SELECT
  USING (active = true OR public.is_admin(auth.uid()));

CREATE POLICY "Hosts view own listing promotions"
  ON public.listing_promotions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_promotions.listing_id AND l.host_id = auth.uid()
  ));

CREATE POLICY "Admins manage promotions"
  ON public.listing_promotions FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_listing_promotions_updated_at
  BEFORE UPDATE ON public.listing_promotions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Discount codes ----------------------------------------------
CREATE TABLE public.discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  percent_off INTEGER CHECK (percent_off IS NULL OR (percent_off > 0 AND percent_off <= 100)),
  amount_off_cents INTEGER CHECK (amount_off_cents IS NULL OR amount_off_cents > 0),
  applicable_categories public.monetization_product_category[] NOT NULL DEFAULT ARRAY[]::public.monetization_product_category[],
  applicable_product_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  max_uses INTEGER,
  uses INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT discount_codes_amount_or_percent CHECK (
    (percent_off IS NOT NULL AND amount_off_cents IS NULL)
    OR (percent_off IS NULL AND amount_off_cents IS NOT NULL)
  )
);

GRANT SELECT ON public.discount_codes TO authenticated;
GRANT ALL ON public.discount_codes TO service_role;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active codes"
  ON public.discount_codes FOR SELECT
  USING (active = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage discount codes"
  ON public.discount_codes FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_discount_codes_updated_at
  BEFORE UPDATE ON public.discount_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Discount redemptions ----------------------------------------
CREATE TABLE public.discount_code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  purchase_id UUID NOT NULL REFERENCES public.monetization_purchases(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (code_id, purchase_id)
);

GRANT SELECT, INSERT ON public.discount_code_redemptions TO authenticated;
GRANT ALL ON public.discount_code_redemptions TO service_role;
ALTER TABLE public.discount_code_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own redemptions"
  ON public.discount_code_redemptions FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage redemptions"
  ON public.discount_code_redemptions FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- FK for purchases.discount_code_id (added after table exists)
ALTER TABLE public.monetization_purchases
  ADD CONSTRAINT fk_monetization_purchases_discount
  FOREIGN KEY (discount_code_id) REFERENCES public.discount_codes(id) ON DELETE SET NULL;

-- Stripe webhook events (idempotency) -------------------------
CREATE TABLE public.stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'processed',
  error_message TEXT
);

CREATE INDEX idx_stripe_webhook_events_type
  ON public.stripe_webhook_events (event_type, processed_at DESC);

GRANT ALL ON public.stripe_webhook_events TO service_role;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view webhook events"
  ON public.stripe_webhook_events FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Seed initial catalog ----------------------------------------
INSERT INTO public.monetization_products
  (slug, name, category, description, billing_type, price_cents, features, promo_type, duration_days, display_order, refund_policy)
VALUES
  ('featured-listing-30',       'Featured Listing',   'listing_upgrade', 'Featured placement, badge, higher search placement, saved-search email inclusion, extra analytics, and listing refresh for 30 days.', 'one_time', 4900,
    '["Featured placement for 30 days","Featured badge","Higher placement in relevant search results","Included in saved-search emails when applicable","Additional listing analytics","Listing refresh during the promotional period"]'::jsonb,
    'featured_30', 30, 10,
    'Non-refundable once the promotion is active. Refundable within 24 hours of purchase if the promotion has not yet started.'),
  ('seller-pro',                'Seller Pro',         'listing_upgrade', 'Everything in Featured, plus Vendibook listing and pricing review, photo ordering, promo graphic request, buyer interest analytics, priority support, and a Seller Pro badge.', 'one_time', 14900,
    '["Everything in Featured Listing","Vendibook listing description review","Pricing review","Recommended photo ordering","Social media promotional graphic request","Buyer interest analytics","Priority support","Seller Pro badge"]'::jsonb,
    'featured_30', 30, 20,
    'Non-refundable once services begin. Refundable within 24 hours if no service has been delivered.'),
  ('white-glove-seller',        'White Glove Seller', 'seller_service',  'Everything in Seller Pro, plus Vendibook-assisted setup, listing copywriting, pricing consultation, buyer screening, offer organization, document checklist, transaction support, appointment coordination, and a White Glove badge.', 'one_time', 49900,
    '["Everything in Seller Pro","Vendibook-assisted listing setup","Listing copywriting","Pricing consultation","Buyer inquiry screening","Offer organization","Document checklist","Transaction support","Appointment coordination tools","White Glove badge"]'::jsonb,
    NULL, 60, 30,
    'Refundable within 24 hours of purchase if no service has been delivered. Non-refundable once Vendibook has begun setup or delivered any listed service.'),
  ('boost-featured-7',          'Featured Boost — 7 days',   'listing_upgrade', 'Featured badge and priority placement for 7 days.', 'one_time', 1900,
    '["Featured badge","Priority placement in search","Listing refresh"]'::jsonb,
    'featured_7', 7, 40,
    'Non-refundable once the boost is active. Refundable within 24 hours if the boost has not yet started.'),
  ('boost-featured-30',         'Featured Boost — 30 days',  'listing_upgrade', 'Featured badge and priority placement for 30 days.', 'one_time', 4900,
    '["Featured badge","Priority placement in search","Listing refresh"]'::jsonb,
    'featured_30', 30, 41,
    'Non-refundable once the boost is active. Refundable within 24 hours if the boost has not yet started.'),
  ('boost-top-of-search',       'Top of Search — 14 days',   'listing_upgrade', 'Move your listing to the top of relevant search results for 14 days.', 'one_time', 3900,
    '["Top-of-results placement","Applies to matching category and location searches"]'::jsonb,
    'top_of_search', 14, 42,
    'Non-refundable once the boost is active. Refundable within 24 hours if the boost has not yet started.'),
  ('boost-highlight',           'Highlight — 14 days',       'listing_upgrade', 'Highlight your listing card in search and category pages for 14 days.', 'one_time', 1900,
    '["Highlighted card treatment","Applies across search and category pages"]'::jsonb,
    'highlight', 14, 43,
    'Non-refundable once the boost is active. Refundable within 24 hours if the boost has not yet started.'),
  ('boost-motivated-seller',    'Motivated Seller Badge',    'listing_upgrade', 'Add a "Motivated Seller" badge to your listing for 30 days.', 'one_time', 900,
    '["Motivated Seller badge","Signals openness to offers"]'::jsonb,
    'motivated_seller', 30, 44,
    'Non-refundable once the badge is active. Refundable within 24 hours if the badge has not yet started.'),
  ('boost-email-campaign',      'Vendibook Email Campaign',  'listing_upgrade', 'Include your listing in a Vendibook buyer email campaign (subject to editorial fit).', 'one_time', 9900,
    '["Inclusion in a Vendibook buyer email campaign","Editorial placement subject to fit"]'::jsonb,
    'email_campaign', 30, 45,
    'Fully refundable up until the campaign is scheduled. Non-refundable once the campaign has been scheduled.'),
  ('boost-social-feature',      'Social Media Feature',      'listing_upgrade', 'Request a social media feature for your listing (subject to editorial fit).', 'one_time', 4900,
    '["Social media feature request","Editorial placement subject to fit"]'::jsonb,
    'social_feature', 30, 46,
    'Fully refundable up until the feature is scheduled. Non-refundable once the feature has been scheduled.');
