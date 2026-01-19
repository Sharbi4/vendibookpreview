-- Allow users to view profiles of people they have conversations with
CREATE POLICY "Users can view profiles of conversation participants"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE (c.host_id = auth.uid() AND c.shopper_id = profiles.id)
       OR (c.shopper_id = auth.uid() AND c.host_id = profiles.id)
  )
);