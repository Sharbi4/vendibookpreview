-- Listing Concierge price must mirror the monetization catalog ($79), not the retired $149.
UPDATE public.listing_concierge_config c
SET price_cents = p.price_cents,
    updated_at = now()
FROM public.monetization_products p
WHERE c.id = true
  AND p.slug = 'listing_concierge'
  AND p.is_active = true
  AND c.price_cents <> p.price_cents;

-- Re-price any order that has not been paid yet so nobody is charged the stale amount.
UPDATE public.listing_concierge_orders o
SET price_cents = p.price_cents
FROM public.monetization_products p
WHERE p.slug = 'listing_concierge'
  AND p.is_active = true
  AND o.payment_status <> 'paid'
  AND o.price_cents <> p.price_cents;