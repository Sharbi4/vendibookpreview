-- Create storage bucket for AI-generated listing media (audio narration + auto videos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-media', 'listing-media', true)
ON CONFLICT (id) DO NOTHING;

-- Public can read all files in this bucket
CREATE POLICY "Public can read listing media"
ON storage.objects FOR SELECT
USING (bucket_id = 'listing-media');

-- Authenticated users can upload (edge functions use service role and bypass anyway)
CREATE POLICY "Authenticated can upload listing media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'listing-media');

-- Track AI-generated narration / video assets per listing for caching & reuse
CREATE TABLE public.listing_ai_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('audio_narration', 'promo_video')),
  url TEXT NOT NULL,
  voice_id TEXT,
  duration_seconds INTEGER,
  source_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_listing_ai_media_listing ON public.listing_ai_media(listing_id, media_type);

ALTER TABLE public.listing_ai_media ENABLE ROW LEVEL SECURITY;

-- Anyone can read generated media (it's public listing content)
CREATE POLICY "Anyone can read listing AI media"
ON public.listing_ai_media FOR SELECT
USING (true);

-- Only the host owning the listing can manage it (edge functions use service role)
CREATE POLICY "Hosts can manage their listing AI media"
ON public.listing_ai_media FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_ai_media.listing_id AND l.host_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_ai_media.listing_id AND l.host_id = auth.uid()
  )
);