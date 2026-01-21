-- Add counter-offer fields to offers table
ALTER TABLE public.offers 
ADD COLUMN counter_amount numeric NULL,
ADD COLUMN counter_message text NULL,
ADD COLUMN counter_expires_at timestamp with time zone NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.offers.counter_amount IS 'Counter-offer amount proposed by seller';
COMMENT ON COLUMN public.offers.counter_message IS 'Message from seller explaining counter-offer';
COMMENT ON COLUMN public.offers.counter_expires_at IS 'When the counter-offer expires (48h from counter)';