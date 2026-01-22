-- Remove the policy that allows hosts to review documents
-- Documents should only be reviewed by admins
DROP POLICY IF EXISTS "Hosts can review documents" ON public.booking_documents;

-- Create policy for admins to review documents
CREATE POLICY "Admins can review documents"
ON public.booking_documents
FOR UPDATE
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));