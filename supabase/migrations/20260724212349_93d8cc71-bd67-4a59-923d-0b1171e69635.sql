
UPDATE public.monetization_products SET stripe_price_id = CASE slug
  WHEN 'featured-listing-30'      THEN 'price_1TwqKgA6Qt4pF0fM5DMEPi3f'
  WHEN 'seller-pro'               THEN 'price_1TwqKvA6Qt4pF0fMbwVse4ID'
  WHEN 'boost-featured-7'         THEN 'price_1TwqLDA6Qt4pF0fMzckqkG8x'
  WHEN 'boost-featured-30'        THEN 'price_1TwqMZA6Qt4pF0fM87wkcYSh'
  WHEN 'boost-top-of-search'      THEN 'price_1TwqMtA6Qt4pF0fM8e07UHfF'
  WHEN 'boost-highlight'          THEN 'price_1TwqNcA6Qt4pF0fMnXyAz510'
  WHEN 'boost-motivated-seller'   THEN 'price_1TwqNtA6Qt4pF0fMbZ0S5Fqv'
  WHEN 'boost-email-campaign'     THEN 'price_1TwqOJA6Qt4pF0fMrzSDk3kP'
  WHEN 'boost-social-feature'     THEN 'price_1TwqOZA6Qt4pF0fMTyrXTjBF'
  WHEN 'white-glove-seller'       THEN 'price_1TwqOuA6Qt4pF0fMFRHSGeI2'
  WHEN 'listing_rewrite'          THEN 'price_1TwqPGA6Qt4pF0fM6BTNHkkJ'
  WHEN 'pricing_review'           THEN 'price_1TwqPZA6Qt4pF0fMhp4jX5JU'
  WHEN 'buyer_readiness_pass'     THEN 'price_1TwqPpA6Qt4pF0fMtURIqrqA'
  WHEN 'listing_purchase_review'  THEN 'price_1TwqQ8A6Qt4pF0fMM3yZzjqA'
  WHEN 'seller_plus_monthly'      THEN 'price_1TwqQSA6Qt4pF0fMJSLgEdtr'
  WHEN 'seller_plus_annual'       THEN 'price_1TwqQiA6Qt4pF0fMTOIdueM8'
  WHEN 'host_starter'             THEN 'price_1TwqWEA6Qt4pF0fMXUdmNjxR'
  WHEN 'host_starter_annual'      THEN 'price_1TwqWUA6Qt4pF0fMlBPIt8Hk'
  WHEN 'host_growth'              THEN 'price_1TwqWiA6Qt4pF0fMjia9lDhC'
  WHEN 'host_growth_annual'       THEN 'price_1TwqXUA6Qt4pF0fMHkK6FX79'
  WHEN 'host_operator'            THEN 'price_1TwqXiA6Qt4pF0fMUZ0jEaYA'
  WHEN 'host_operator_annual'     THEN 'price_1TwqYgA6Qt4pF0fMaelRM58f'
  WHEN 'permit_path_plus'         THEN 'price_1TwqYzA6Qt4pF0fMeHbD39GS'
  WHEN 'permit_path_concierge'    THEN 'price_1TwqZ3A6Qt4pF0fMiAqrJcoX'
  ELSE stripe_price_id
END,
updated_at = now()
WHERE slug IN (
  'featured-listing-30','seller-pro','boost-featured-7','boost-featured-30',
  'boost-top-of-search','boost-highlight','boost-motivated-seller','boost-email-campaign',
  'boost-social-feature','white-glove-seller','listing_rewrite','pricing_review',
  'buyer_readiness_pass','listing_purchase_review','seller_plus_monthly','seller_plus_annual',
  'host_starter','host_starter_annual','host_growth','host_growth_annual',
  'host_operator','host_operator_annual','permit_path_plus','permit_path_concierge'
);
