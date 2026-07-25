ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS boost_history jsonb NOT NULL DEFAULT '[]'::jsonb;