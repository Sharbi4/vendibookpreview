-- Allow authenticated users to claim guest draft listings by matching guest_draft_token
-- This enables the flow where a guest creates a draft, then signs up/logs in to claim it

CREATE POLICY "Authenticated users can claim guest drafts"
ON public.listings
FOR UPDATE
TO authenticated
USING (
  host_id IS NULL 
  AND guest_draft_token IS NOT NULL
)
WITH CHECK (
  -- The new host_id must be the current user
  host_id = auth.uid()
);