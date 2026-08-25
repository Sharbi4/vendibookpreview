CREATE TABLE public.financing_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text,
  email text NOT NULL,
  source text NOT NULL DEFAULT 'unknown',
  provider text NOT NULL DEFAULT 'equinox',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX financing_leads_created_at_idx ON public.financing_leads (created_at DESC);
CREATE INDEX financing_leads_listing_idx ON public.financing_leads (listing_id);

GRANT INSERT ON public.financing_leads TO anon;
GRANT SELECT, INSERT ON public.financing_leads TO authenticated;
GRANT ALL ON public.financing_leads TO service_role;

ALTER TABLE public.financing_leads ENABLE ROW LEVEL SECURITY;

-- Anyone may submit a financing lead (buyers are often signed out), but the
-- row must not claim to belong to another account.
CREATE POLICY "Anyone can submit a financing lead"
  ON public.financing_leads FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can view their own financing leads"
  ON public.financing_leads FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all financing leads"
  ON public.financing_leads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));