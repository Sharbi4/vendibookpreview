-- Add fulfillment and customer information fields to sale_transactions
ALTER TABLE public.sale_transactions 
ADD COLUMN IF NOT EXISTS fulfillment_type text,
ADD COLUMN IF NOT EXISTS delivery_address text,
ADD COLUMN IF NOT EXISTS delivery_instructions text,
ADD COLUMN IF NOT EXISTS delivery_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS buyer_name text,
ADD COLUMN IF NOT EXISTS buyer_email text,
ADD COLUMN IF NOT EXISTS buyer_phone text;

-- Add comment for documentation
COMMENT ON COLUMN public.sale_transactions.fulfillment_type IS 'pickup or delivery';
COMMENT ON COLUMN public.sale_transactions.delivery_address IS 'Buyer delivery address if delivery selected';
COMMENT ON COLUMN public.sale_transactions.delivery_fee IS 'Delivery fee if applicable';