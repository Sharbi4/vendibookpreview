
-- Column for automatic member discount (percent off for active subscribers on one-time add-ons)
ALTER TABLE public.monetization_products
  ADD COLUMN IF NOT EXISTS member_discount_pct integer NOT NULL DEFAULT 0
  CHECK (member_discount_pct >= 0 AND member_discount_pct <= 100);

-- Seller Plus tier (individual seller, non-host)
INSERT INTO public.monetization_products
  (slug, name, category, billing_type, price_cents, currency, description, display_order, is_active, features, metadata)
VALUES
  ('seller_plus_monthly', 'Seller Plus (Monthly)', 'host_subscription', 'recurring', 2900, 'usd',
   'For individual sellers: reduced listing fees, priority placement on your listings, and AI listing tools.',
   290, true,
   '["Reduced platform fees","Priority placement on your listings","AI Listing Rewrite (1/mo included)","Priority email support"]'::jsonb,
   '{"tier":"seller_plus","interval":"month"}'::jsonb),
  ('seller_plus_annual', 'Seller Plus (Annual)', 'host_subscription', 'recurring', 29000, 'usd',
   'Seller Plus billed annually — save two months.',
   291, true,
   '["Everything in Seller Plus","Save ~17% vs monthly"]'::jsonb,
   '{"tier":"seller_plus","interval":"year"}'::jsonb),

-- Annual variants for existing host subscriptions (grandfather existing monthly customers)
  ('host_starter_annual', 'Host Starter (Annual)', 'host_subscription', 'recurring', 39000, 'usd',
   'Host Starter billed annually — save two months vs monthly.',
   301, true,
   '["Everything in Host Starter","Save ~17% vs monthly"]'::jsonb,
   '{"tier":"starter","interval":"year"}'::jsonb),
  ('host_growth_annual', 'Host Growth (Annual)', 'host_subscription', 'recurring', 89000, 'usd',
   'Host Growth billed annually — save two months vs monthly.',
   311, true,
   '["Everything in Host Growth","Save ~17% vs monthly"]'::jsonb,
   '{"tier":"pro","interval":"year"}'::jsonb),
  ('host_operator_annual', 'Host Operator (Annual)', 'host_subscription', 'recurring', 149000, 'usd',
   'Host Operator billed annually — save two months vs monthly.',
   321, true,
   '["Everything in Host Operator","Save ~17% vs monthly"]'::jsonb,
   '{"tier":"premium","interval":"year"}'::jsonb),

-- New seller service add-ons
  ('listing_rewrite', 'AI Listing Rewrite', 'seller_service', 'one_time', 5900, 'usd',
   'Our AI rewrites your title, description, and highlights for maximum conversion. Reviewed by a Vendibook editor.',
   150, true,
   '["Conversion-optimized rewrite","Editor review","Delivered within 24h","Included free with Seller Plus (1/mo)"]'::jsonb,
   '{"deliverable":"listing_copy"}'::jsonb),
  ('pricing_review', 'Expert Pricing Review', 'seller_service', 'one_time', 7900, 'usd',
   'A Vendibook pricing specialist analyzes your listing against local comps and recommends optimal daily / weekly rates.',
   160, true,
   '["Local comp analysis","Rate recommendation report","30-min consult call","Delivered within 48h"]'::jsonb,
   '{"deliverable":"pricing_report"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- Enable member discounts on one-time add-ons (10% for subscribers)
UPDATE public.monetization_products
   SET member_discount_pct = 10
 WHERE billing_type = 'one_time'
   AND category IN ('listing_upgrade', 'seller_service', 'buyer_service')
   AND member_discount_pct = 0;
