-- Ensure anon and authenticated can actually reach the table via PostgREST.
GRANT INSERT ON public.newsletter_subscribers TO anon, authenticated;

-- Recreate the permissive INSERT policy scoped explicitly to anon + authenticated.
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe to newsletter"
  ON public.newsletter_subscribers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);