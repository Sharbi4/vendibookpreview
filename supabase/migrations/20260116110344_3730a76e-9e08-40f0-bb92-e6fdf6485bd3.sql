-- Allow admins to view all booking documents
CREATE POLICY "Admins can view all booking documents"
ON public.booking_documents
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Allow admins to update booking documents (approve/reject)
CREATE POLICY "Admins can update all booking documents"
ON public.booking_documents
FOR UPDATE
USING (public.is_admin(auth.uid()));