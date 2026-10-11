ALTER TABLE public.monetization_products
  ADD COLUMN IF NOT EXISTS paypal_product_env text;

-- Every existing paypal_product_id was minted in the PayPal sandbox.
UPDATE public.monetization_products
   SET paypal_product_env = 'sandbox'
 WHERE paypal_product_id IS NOT NULL
   AND paypal_product_env IS NULL;

COMMENT ON COLUMN public.monetization_products.paypal_product_env IS
  'PayPal environment (sandbox|live) that paypal_product_id belongs to. Catalog IDs are NOT portable across environments.';