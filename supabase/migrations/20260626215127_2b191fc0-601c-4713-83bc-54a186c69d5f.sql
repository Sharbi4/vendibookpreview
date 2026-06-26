-- PermitPath: persist a user's checked-off items per roadmap (state+city+businessType).

CREATE TABLE public.permit_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  roadmap_key TEXT NOT NULL,
  state_code TEXT NOT NULL,
  city TEXT,
  business_type TEXT,
  completed JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT permit_progress_user_roadmap_unique UNIQUE (user_id, roadmap_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.permit_progress TO authenticated;
GRANT ALL ON public.permit_progress TO service_role;

ALTER TABLE public.permit_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own permit progress"
  ON public.permit_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own permit progress"
  ON public.permit_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own permit progress"
  ON public.permit_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own permit progress"
  ON public.permit_progress FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX permit_progress_user_idx ON public.permit_progress (user_id, updated_at DESC);

-- Updated-at trigger using existing helper if available, else create local one.
CREATE OR REPLACE FUNCTION public.permit_progress_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER permit_progress_updated_at
BEFORE UPDATE ON public.permit_progress
FOR EACH ROW EXECUTE FUNCTION public.permit_progress_set_updated_at();