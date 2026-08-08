ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_condition_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_condition_check CHECK (
  condition IS NULL OR condition = ANY (ARRAY['new','like_new','good','fair','needs_work','used','project'])
) NOT VALID;
ALTER TABLE public.listings VALIDATE CONSTRAINT listings_condition_check;