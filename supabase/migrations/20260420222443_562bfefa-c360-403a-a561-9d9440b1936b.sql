-- Daily analytics rollup table
CREATE TABLE public.listing_analytics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  host_id uuid NOT NULL,
  date date NOT NULL,
  views integer NOT NULL DEFAULT 0,
  unique_viewers integer NOT NULL DEFAULT 0,
  inquiries integer NOT NULL DEFAULT 0,
  bookings integer NOT NULL DEFAULT 0,
  revenue numeric NOT NULL DEFAULT 0,
  source_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, date)
);

CREATE INDEX idx_lad_listing_date ON public.listing_analytics_daily (listing_id, date DESC);
CREATE INDEX idx_lad_host_date ON public.listing_analytics_daily (host_id, date DESC);

ALTER TABLE public.listing_analytics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view their own listing analytics"
  ON public.listing_analytics_daily FOR SELECT
  USING (auth.uid() = host_id);

CREATE POLICY "Admins can view all listing analytics"
  ON public.listing_analytics_daily FOR SELECT
  USING (is_admin(auth.uid()));

-- AI insights table
CREATE TABLE public.listing_ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  host_id uuid NOT NULL,
  health_score integer NOT NULL CHECK (health_score >= 0 AND health_score <= 100),
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  competitor_summary jsonb,
  model_used text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lai_listing ON public.listing_ai_insights (listing_id, generated_at DESC);
CREATE INDEX idx_lai_host ON public.listing_ai_insights (host_id, generated_at DESC);

ALTER TABLE public.listing_ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view their own listing insights"
  ON public.listing_ai_insights FOR SELECT
  USING (auth.uid() = host_id);

CREATE POLICY "Admins can view all listing insights"
  ON public.listing_ai_insights FOR SELECT
  USING (is_admin(auth.uid()));

-- Promotion assets table (AI ad copy, social share images, etc.)
CREATE TABLE public.promotion_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  host_id uuid NOT NULL,
  channel text NOT NULL CHECK (channel IN ('meta', 'google', 'instagram', 'facebook', 'tiktok', 'twitter', 'email', 'native')),
  asset_type text NOT NULL CHECK (asset_type IN ('ad_copy', 'social_image', 'email_subject', 'email_body', 'video_script', 'seo_metadata')),
  title text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  performance_metrics jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pa_listing ON public.promotion_assets (listing_id, channel);
CREATE INDEX idx_pa_host ON public.promotion_assets (host_id);

ALTER TABLE public.promotion_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view their own promotion assets"
  ON public.promotion_assets FOR SELECT
  USING (auth.uid() = host_id);

CREATE POLICY "Hosts can create their own promotion assets"
  ON public.promotion_assets FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their own promotion assets"
  ON public.promotion_assets FOR UPDATE
  USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete their own promotion assets"
  ON public.promotion_assets FOR DELETE
  USING (auth.uid() = host_id);

CREATE POLICY "Admins can manage all promotion assets"
  ON public.promotion_assets FOR ALL
  USING (is_admin(auth.uid()));

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.update_updated_at_pa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pa_updated_at
  BEFORE UPDATE ON public.promotion_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_pa();

CREATE TRIGGER trg_lad_updated_at
  BEFORE UPDATE ON public.listing_analytics_daily
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_pa();