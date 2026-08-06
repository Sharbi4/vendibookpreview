ALTER TABLE public.listing_specs
  ADD COLUMN IF NOT EXISTS equipment_inventory jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS utilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS safety jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS vehicle jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS trailer jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS space jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS condition_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ownership_public jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 0;

ALTER TABLE public.listing_specs
  ADD COLUMN IF NOT EXISTS q_fresh_water_gal numeric
    GENERATED ALWAYS AS (NULLIF(utilities->>'fresh_water_gal','')::numeric) STORED,
  ADD COLUMN IF NOT EXISTS q_grey_water_gal numeric
    GENERATED ALWAYS AS (NULLIF(utilities->>'grey_water_gal','')::numeric) STORED,
  ADD COLUMN IF NOT EXISTS q_shore_power text
    GENERATED ALWAYS AS (NULLIF(utilities->>'shore_power','')) STORED,
  ADD COLUMN IF NOT EXISTS q_has_generator boolean
    GENERATED ALWAYS AS (NULLIF(utilities->>'generator_present','') = 'true') STORED,
  ADD COLUMN IF NOT EXISTS q_hood_type text
    GENERATED ALWAYS AS (NULLIF(safety->>'hood_type','')) STORED,
  ADD COLUMN IF NOT EXISTS q_operational_status text
    GENERATED ALWAYS AS (NULLIF(condition_details->>'operational_status','')) STORED;

CREATE INDEX IF NOT EXISTS idx_listing_specs_q_water ON public.listing_specs (q_fresh_water_gal);
CREATE INDEX IF NOT EXISTS idx_listing_specs_q_power ON public.listing_specs (q_shore_power);
CREATE INDEX IF NOT EXISTS idx_listing_specs_q_hood ON public.listing_specs (q_hood_type);
CREATE INDEX IF NOT EXISTS idx_listing_specs_q_status ON public.listing_specs (q_operational_status);

ALTER TABLE public.listing_ownership_details
  ADD COLUMN IF NOT EXISTS titled_owner text,
  ADD COLUMN IF NOT EXISTS authority_to_sell boolean,
  ADD COLUMN IF NOT EXISTS title_name_type text,
  ADD COLUMN IF NOT EXISTS title_state text,
  ADD COLUMN IF NOT EXISTS active_lien boolean,
  ADD COLUMN IF NOT EXISTS lien_release_available boolean,
  ADD COLUMN IF NOT EXISTS vin_serial text,
  ADD COLUMN IF NOT EXISTS manufacturer_plate text,
  ADD COLUMN IF NOT EXISTS title_number text,
  ADD COLUMN IF NOT EXISTS documents_available boolean;

DROP POLICY IF EXISTS "Owners manage their ownership docs" ON storage.objects;
CREATE POLICY "Owners manage their ownership docs"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'listing-ownership-docs'
  AND (auth.uid()::text = (storage.foldername(name))[1]
       OR public.has_role(auth.uid(), 'admin'::public.app_role))
)
WITH CHECK (
  bucket_id = 'listing-ownership-docs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);