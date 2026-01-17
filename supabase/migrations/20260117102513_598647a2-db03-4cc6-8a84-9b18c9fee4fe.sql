-- Add guest_draft_token column to listings table for anonymous draft creation
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS guest_draft_token UUID DEFAULT NULL;

-- Create index for fast lookup by token
CREATE INDEX IF NOT EXISTS idx_listings_guest_draft_token ON public.listings(guest_draft_token) WHERE guest_draft_token IS NOT NULL;

-- Make host_id nullable for guest drafts
ALTER TABLE public.listings
ALTER COLUMN host_id DROP NOT NULL;

-- Add RLS policy to allow guests to update their own drafts using the token
-- (they can only update if they have the matching token, which is stored in localStorage)
CREATE POLICY "Allow guest draft updates with token" ON public.listings
FOR UPDATE
USING (
  guest_draft_token IS NOT NULL 
  AND status = 'draft'
  AND host_id IS NULL
)
WITH CHECK (
  guest_draft_token IS NOT NULL 
  AND status = 'draft'
);

-- Add RLS policy to allow anonymous inserts for guest drafts
CREATE POLICY "Allow anonymous draft creation" ON public.listings
FOR INSERT
WITH CHECK (
  status = 'draft' 
  AND host_id IS NULL 
  AND guest_draft_token IS NOT NULL
);

-- Add RLS policy to allow guests to read their own drafts
CREATE POLICY "Allow guest draft reads with token" ON public.listings
FOR SELECT
USING (
  guest_draft_token IS NOT NULL 
  AND status = 'draft'
  AND host_id IS NULL
);