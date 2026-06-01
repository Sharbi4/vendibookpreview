
CREATE TABLE IF NOT EXISTS public.blog_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  source TEXT DEFAULT 'subscribe_page',
  user_agent TEXT,
  confirmed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS blog_subscribers_email_unique
  ON public.blog_subscribers (lower(email));

GRANT INSERT ON public.blog_subscribers TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.blog_subscribers TO authenticated;
GRANT ALL ON public.blog_subscribers TO service_role;

ALTER TABLE public.blog_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe"
  ON public.blog_subscribers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view subscribers"
  ON public.blog_subscribers FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update subscribers"
  ON public.blog_subscribers FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete subscribers"
  ON public.blog_subscribers FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
