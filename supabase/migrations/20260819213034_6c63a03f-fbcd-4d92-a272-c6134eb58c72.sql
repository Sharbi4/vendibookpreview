-- 2026 catalog refresh: Vendibook Pro / PermitPath Plus recurring, Pro Listing,
-- retire legacy tiers + weekly pass. No historical rows are deleted or rewritten.

-- 1. New recurring: Vendibook Pro ($79/mo)
INSERT INTO public.monetization_products
  (slug, name, category, description, billing_type, price_cents, currency, display_order, is_active, metadata)
VALUES (
  'vendibook_pro',
  'Vendibook Pro',
  'host_subscription',
  'Monthly Vendibook Pro membership — reduced marketplace fee and a Featured Boost credit every billing period.',
  'recurring', 7900, 'usd', 10, true,
  jsonb_build_object(
    'grants_tier', 'pro',
    'plan_family', 'vendibook_pro_2026',
    'benefit_rules', jsonb_build_object(
      'standard_transaction_fee_pct', 12.9,
      'pro_transaction_fee_pct', 10.9,
      'max_savings_cents_per_transaction', 50000,
      'featured_boost_credits_per_period', 1,
      'credits_roll_over', false,
      'enforced', false
    )
  )
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  billing_type = EXCLUDED.billing_type,
  price_cents = EXCLUDED.price_cents,
  is_active = true,
  metadata = public.monetization_products.metadata || EXCLUDED.metadata,
  updated_at = now();

-- 2. New recurring: PermitPath Plus ($7.99/mo)
INSERT INTO public.monetization_products
  (slug, name, category, description, billing_type, price_cents, currency, display_order, is_active, metadata)
VALUES (
  'permit_path_plus_monthly',
  'PermitPath Plus',
  'permit_upgrade',
  'Monthly PermitPath Plus access — full permit roadmaps, documents and renewals.',
  'recurring', 799, 'usd', 20, true,
  jsonb_build_object('tool_slug', 'permitpath', 'plan_family', 'permitpath_2026')
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  billing_type = EXCLUDED.billing_type,
  price_cents = EXCLUDED.price_cents,
  is_active = true,
  metadata = public.monetization_products.metadata || EXCLUDED.metadata,
  updated_at = now();

-- 3. New one-time: Pro Listing ($69 / 30 days)
INSERT INTO public.monetization_products
  (slug, name, category, description, billing_type, price_cents, currency, duration_days, display_order, is_active, metadata)
VALUES (
  'pro_listing_30',
  'Pro Listing — 30 days',
  'listing_upgrade',
  'Upgrade a single listing to Pro placement and presentation for 30 days.',
  'one_time', 6900, 'usd', 30, 30, true,
  jsonb_build_object('duration_days', 30, 'listing_scope', true, 'plan_family', 'pro_listing_2026')
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_cents = EXCLUDED.price_cents,
  duration_days = EXCLUDED.duration_days,
  is_active = true,
  metadata = public.monetization_products.metadata || EXCLUDED.metadata,
  updated_at = now();

-- 4. Concierge Listing → $79 one-time
UPDATE public.monetization_products
   SET price_cents = 7900, updated_at = now()
 WHERE slug = 'listing_concierge';

-- 5. Retire from NEW purchases only (records + entitlements untouched)
UPDATE public.monetization_products
   SET is_active = false,
       metadata = metadata || jsonb_build_object('retired_at', now(), 'retired_reason', 'catalog_refresh_2026'),
       updated_at = now()
 WHERE slug IN (
   'pro_weekly_pass',
   'host_starter', 'host_starter_annual',
   'host_growth', 'host_growth_annual',
   'host_operator', 'host_operator_annual',
   'permit_path_plus'
 );