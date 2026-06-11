CREATE TABLE public.blog_share_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_slug text NOT NULL,
  source text NOT NULL,
  campaign text,
  cta_label text,
  destination_url text,
  referrer text,
  user_agent text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.blog_share_clicks TO anon, authenticated;
GRANT SELECT ON public.blog_share_clicks TO authenticated;
GRANT ALL ON public.blog_share_clicks TO service_role;

ALTER TABLE public.blog_share_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert blog share clicks"
ON public.blog_share_clicks
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can read blog share clicks"
ON public.blog_share_clicks
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_blog_share_clicks_slug_created ON public.blog_share_clicks (article_slug, created_at DESC);