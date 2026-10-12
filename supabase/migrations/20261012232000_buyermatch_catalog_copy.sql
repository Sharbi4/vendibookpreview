-- Merchandising copy only. Billing, provider plans and paid entitlements are untouched.
UPDATE public.monetization_products
SET description='Monthly Vendibook Pro membership with BuyerMatch AI buyer discovery, reviewed outreach reports, premium tools, and one Featured Boost credit per paid billing period. Eligible campaigns require activation and are subject to capacity; no guaranteed leads or sales.',
 metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
  'equipment_sale_fee_pct',8.7,
  'legacy_pro_discount_scope','rentals_only',
  'buyermatch',jsonb_build_object('fulfillment','reviewed_manual_import','activation_required',true,'guaranteed_results',false))
WHERE slug='vendibook_pro';
