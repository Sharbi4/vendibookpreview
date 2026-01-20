-- Allow authenticated users to insert document requirements for their owned listings
-- This policy already exists but the issue is with guest drafts

-- Add policy to allow inserting documents for guest drafts (matching token scenario)
-- The user should be able to add documents if they created the listing (even if host_id is null)
-- We need to update the listing first to claim it, but documents save happens separately

-- Better approach: Update the existing INSERT policy to also handle the transition period
-- where a listing might have host_id null but the user is authenticated and claiming it

DROP POLICY IF EXISTS "Hosts can create document requirements" ON public.listing_required_documents;

CREATE POLICY "Hosts can create document requirements"
ON public.listing_required_documents
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM listings
    WHERE listings.id = listing_required_documents.listing_id
    AND (
      -- Normal case: user owns the listing
      listings.host_id = auth.uid()
      -- OR guest draft that can be claimed (will be claimed on publish)
      OR (listings.host_id IS NULL AND listings.status = 'draft')
    )
  )
);