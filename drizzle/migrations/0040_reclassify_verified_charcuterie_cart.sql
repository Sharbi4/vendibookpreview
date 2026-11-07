-- Owner-requested review: seller describes a folding wooden serving cart that
-- fits in a Honda Civic, with wheels, shelf, food slots and umbrella hole.
-- This is the one confirmed public standalone cart found in the Nov 6 review.
-- Archived samples and full trailers containing a cart remain unchanged.
UPDATE public.listings
SET category = 'food_cart'::public.listing_category, subcategory = 'food_cart'
WHERE id = '86efe80b-2581-47a8-a836-769364460aa6'
  AND category = 'food_truck'::public.listing_category
  AND title = 'Charcuterie cart'
  AND status = 'published'::public.listing_status
  AND deleted_at IS NULL;
