-- Create sale_transactions table for escrow-style sales
CREATE TABLE public.sale_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  platform_fee NUMERIC NOT NULL,
  seller_payout NUMERIC NOT NULL,
  payment_intent_id TEXT,
  checkout_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'buyer_confirmed', 'seller_confirmed', 'completed', 'disputed', 'refunded', 'cancelled')),
  buyer_confirmed_at TIMESTAMP WITH TIME ZONE,
  seller_confirmed_at TIMESTAMP WITH TIME ZONE,
  payout_completed_at TIMESTAMP WITH TIME ZONE,
  transfer_id TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sale_transactions ENABLE ROW LEVEL SECURITY;

-- Buyers can view their own transactions
CREATE POLICY "Buyers can view their transactions"
ON public.sale_transactions
FOR SELECT
USING (auth.uid() = buyer_id);

-- Sellers can view transactions for their listings
CREATE POLICY "Sellers can view their transactions"
ON public.sale_transactions
FOR SELECT
USING (auth.uid() = seller_id);

-- Buyers can create transactions (when purchasing)
CREATE POLICY "Buyers can create transactions"
ON public.sale_transactions
FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

-- Buyers can confirm their side
CREATE POLICY "Buyers can update their confirmation"
ON public.sale_transactions
FOR UPDATE
USING (auth.uid() = buyer_id AND status IN ('paid', 'seller_confirmed'));

-- Sellers can confirm their side
CREATE POLICY "Sellers can update their confirmation"
ON public.sale_transactions
FOR UPDATE
USING (auth.uid() = seller_id AND status IN ('paid', 'buyer_confirmed'));

-- Add trigger for updated_at
CREATE TRIGGER update_sale_transactions_updated_at
BEFORE UPDATE ON public.sale_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for common queries
CREATE INDEX idx_sale_transactions_buyer ON public.sale_transactions(buyer_id);
CREATE INDEX idx_sale_transactions_seller ON public.sale_transactions(seller_id);
CREATE INDEX idx_sale_transactions_status ON public.sale_transactions(status);