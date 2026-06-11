DROP POLICY IF EXISTS "Anyone can insert blog share clicks" ON public.blog_share_clicks;

CREATE POLICY "Public can insert blog share clicks"
ON public.blog_share_clicks
FOR INSERT
TO public
WITH CHECK (true);