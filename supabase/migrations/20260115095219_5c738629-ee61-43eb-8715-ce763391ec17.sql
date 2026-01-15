-- Add Vendibook freight fields to listings table
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS vendibook_freight_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS freight_payer text DEFAULT 'buyer' CHECK (freight_payer IN ('buyer', 'seller'));

-- Add comment to explain the freight fields
COMMENT ON COLUMN public.listings.vendibook_freight_enabled IS 'Whether Vendibook freight delivery is enabled for this listing';
COMMENT ON COLUMN public.listings.freight_payer IS 'Who pays for freight: buyer (at checkout) or seller (deducted from payout)';

-- Add freight_cost to sale_transactions for tracking seller-paid freight deductions
ALTER TABLE public.sale_transactions
ADD COLUMN IF NOT EXISTS freight_cost numeric DEFAULT 0;