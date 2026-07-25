UPDATE public.monetization_products
   SET is_active = false,
       updated_at = now()
 WHERE slug IN (
    'seller_plus_monthly','seller_plus_annual',
    'boost-motivated-seller','boost-featured-7','boost-highlight','boost-top-of-search',
    'featured-listing-30','boost-social-feature','boost-email-campaign','seller-pro',
    'tool_listing_studio','tool_pricepilot','tool_concept_lab','tool_market_radar',
    'tool_marketing_studio','tool_buildkit',
    'pricing_review','white-glove-seller',
    'permit_path_concierge',
    'buyer_readiness_pass','listing_purchase_review'
 )
   AND is_active = true;