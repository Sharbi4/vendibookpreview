ALTER TABLE public.listing_completeness
  ADD COLUMN IF NOT EXISTS score_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS computed_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.listing_spec_suggestions
  ADD COLUMN IF NOT EXISTS source_text text,
  ADD COLUMN IF NOT EXISTS confidence numeric,
  ADD COLUMN IF NOT EXISTS accepted_value jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS listing_spec_suggestions_unique_field
  ON public.listing_spec_suggestions (listing_id, section, field);