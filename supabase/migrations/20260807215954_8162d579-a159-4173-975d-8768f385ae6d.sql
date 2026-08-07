CREATE TABLE public.listing_financing_preferences (
  listing_id uuid PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
  host_id uuid NOT NULL,
  equinox_opt_in boolean NOT NULL DEFAULT false,
  include_vin boolean NOT NULL DEFAULT false,
  disclosure_version text,
  disclosure_accepted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.listing_financing_preferences TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_financing_preferences TO authenticated;
GRANT ALL ON public.listing_financing_preferences TO service_role;

ALTER TABLE public.listing_financing_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Financing opt-in is publicly readable"
  ON public.listing_financing_preferences
  FOR SELECT
  USING (true);

CREATE POLICY "Owners manage their listing financing preferences"
  ON public.listing_financing_preferences
  FOR ALL
  TO authenticated
  USING (
    host_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_id AND l.host_id = auth.uid()
    )
  )
  WITH CHECK (
    host_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_id AND l.host_id = auth.uid()
    )
  );

CREATE INDEX idx_listing_financing_preferences_host
  ON public.listing_financing_preferences (host_id);

CREATE TRIGGER trg_listing_financing_preferences_updated_at
  BEFORE UPDATE ON public.listing_financing_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payments_transition_ack_at timestamp with time zone;