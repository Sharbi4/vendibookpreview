-- Drop the existing check constraint and add a new one that includes 'pending_cash'
ALTER TABLE public.sale_transactions DROP CONSTRAINT IF EXISTS sale_transactions_status_check;

ALTER TABLE public.sale_transactions 
ADD CONSTRAINT sale_transactions_status_check 
CHECK (status IN ('pending', 'pending_cash', 'paid', 'buyer_confirmed', 'seller_confirmed', 'completed', 'disputed', 'refunded', 'cancelled'));