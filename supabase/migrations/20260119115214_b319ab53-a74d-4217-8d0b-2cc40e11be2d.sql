-- Add proof_notary_enabled column to listings table for sale listings
ALTER TABLE public.listings
ADD COLUMN proof_notary_enabled boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.listings.proof_notary_enabled IS 'Whether Proof Notary add-on is enabled for sale listings ($45 fee)';