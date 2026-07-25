
INSERT INTO public.monetization_products (slug, name, category, description, billing_type, price_cents, currency, features, display_order, is_active, metadata)
VALUES
  ('tool_pricepilot',        'PricePilot — Lifetime',        'seller_service', 'One-time unlock for PricePilot. Included with Pro.',        'one_time', 1900, 'usd', '["AI-driven pricing model","Compares your rates to your local market","Recommends nightly, weekly, and monthly rates"]'::jsonb, 210, true, '{"tool_slug":"pricepilot"}'::jsonb),
  ('tool_listing_studio',    'Listing Studio — Lifetime',    'seller_service', 'One-time unlock for Listing Studio. Included with Pro.',    'one_time', 1900, 'usd', '["AI-written title and description","Converts browsers to bookers","Optimized for the Vendibook search index"]'::jsonb, 211, true, '{"tool_slug":"listing_studio"}'::jsonb),
  ('tool_marketing_studio',  'Marketing Studio — Lifetime',  'seller_service', 'One-time unlock for Marketing Studio. Included with Pro.',  'one_time', 2900, 'usd', '["Ad copy in your voice","Social posts and email launch kits","Templates for repeat customers"]'::jsonb, 212, true, '{"tool_slug":"marketing_studio"}'::jsonb),
  ('tool_concept_lab',       'Concept Lab — Lifetime',       'seller_service', 'One-time unlock for Concept Lab. Included with Pro.',       'one_time', 2900, 'usd', '["Menu and truck concept validation","Localized to your metro","Pricing and margin math built in"]'::jsonb, 213, true, '{"tool_slug":"concept_lab"}'::jsonb),
  ('tool_market_radar',      'Market Radar — Lifetime',      'seller_service', 'One-time unlock for Market Radar. Included with Pro.',      'one_time', 2900, 'usd', '["Demand and competition heatmap","Event and seasonality overlays","Trade area drive-time analysis"]'::jsonb, 214, true, '{"tool_slug":"market_radar"}'::jsonb),
  ('tool_buildkit',          'BuildKit — Lifetime',          'seller_service', 'One-time unlock for BuildKit. Included with Premium.',      'one_time', 4900, 'usd', '["Blueprints and equipment sourcing","Vetted vendor list","Cost benchmarks by build stage"]'::jsonb, 215, true, '{"tool_slug":"buildkit"}'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_cents = EXCLUDED.price_cents,
  features = EXCLUDED.features,
  metadata = EXCLUDED.metadata,
  is_active = true;
