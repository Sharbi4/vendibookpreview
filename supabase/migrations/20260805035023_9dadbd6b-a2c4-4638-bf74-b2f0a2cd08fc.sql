-- 1) Public, buyer-facing specification columns on listings
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS year_built integer,
  ADD COLUMN IF NOT EXISTS make text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS condition text,
  ADD COLUMN IF NOT EXISTS mileage integer,
  ADD COLUMN IF NOT EXISTS fuel_type text,
  ADD COLUMN IF NOT EXISTS space_sqft integer;

ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS listings_condition_check;
ALTER TABLE public.listings
  ADD CONSTRAINT listings_condition_check
  CHECK (condition IS NULL OR condition IN ('new','like_new','used','project'));

ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS listings_fuel_type_check;
ALTER TABLE public.listings
  ADD CONSTRAINT listings_fuel_type_check
  CHECK (fuel_type IS NULL OR fuel_type IN ('gasoline','diesel','hybrid','electric','propane','other'));

-- 2) Private ownership / title status (NEVER public)
CREATE TABLE IF NOT EXISTS public.listing_ownership_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL UNIQUE REFERENCES public.listings(id) ON DELETE CASCADE,
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title_status text NOT NULL CHECK (title_status IN ('clear_title','lien_on_title','no_title_bill_of_sale','not_sure')),
  lien_holder_name text,
  ownership_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS listing_ownership_details_host_id_idx
  ON public.listing_ownership_details (host_id);

-- Grants: authenticated owners + admins only. Deliberately NO grant to anon.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_ownership_details TO authenticated;
GRANT ALL ON public.listing_ownership_details TO service_role;

ALTER TABLE public.listing_ownership_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts manage their own ownership details" ON public.listing_ownership_details;
CREATE POLICY "Hosts manage their own ownership details"
  ON public.listing_ownership_details
  FOR ALL
  TO authenticated
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "Admins can view ownership details" ON public.listing_ownership_details;
CREATE POLICY "Admins can view ownership details"
  ON public.listing_ownership_details
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS set_listing_ownership_details_updated_at ON public.listing_ownership_details;
CREATE TRIGGER set_listing_ownership_details_updated_at
  BEFORE UPDATE ON public.listing_ownership_details
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();