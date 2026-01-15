-- Add tracking fields to sale_transactions table
ALTER TABLE public.sale_transactions
ADD COLUMN IF NOT EXISTS shipping_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS tracking_number TEXT,
ADD COLUMN IF NOT EXISTS carrier TEXT,
ADD COLUMN IF NOT EXISTS tracking_url TEXT,
ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS shipping_notes TEXT;

-- Add index for faster lookups by shipping status
CREATE INDEX IF NOT EXISTS idx_sale_transactions_shipping_status ON public.sale_transactions(shipping_status);

-- Enable realtime for sale_transactions to allow real-time tracking updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.sale_transactions;