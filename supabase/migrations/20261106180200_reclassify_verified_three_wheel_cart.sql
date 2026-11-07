-- Second individually reviewed public cart found by reading descriptions and
-- the seller's cover image (1781182024445-ppp4gp.jpeg). Three-wheel vendor cart;
-- seller explicitly describes a scratch-built vendor cart with a drinks bin.
-- Preserve the seller's title, price, owner and publication status.
UPDATE public.listings
SET category = 'food_cart'::public.listing_category, subcategory = 'food_cart'
WHERE id = '154df4be-3102-44c9-b014-b36bafce8391'
  AND category = 'food_trailer'::public.listing_category
  AND title = 'My Food Trailer'
  AND description ILIKE '%vendor cart%'
  AND status = 'published'::public.listing_status
  AND deleted_at IS NULL;
