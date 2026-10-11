ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS delivery_fee_type text NOT NULL DEFAULT 'flat';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'listings_delivery_fee_type_check'
  ) THEN
    ALTER TABLE public.listings
      ADD CONSTRAINT listings_delivery_fee_type_check
      CHECK (delivery_fee_type IN ('flat', 'per_mile'));
  END IF;
END $$;