CREATE OR REPLACE FUNCTION public.get_hero_listings(p_limit integer DEFAULT 6)
RETURNS TABLE (
  id uuid,
  title text,
  city text,
  state text,
  category text,
  mode text,
  cover_image_url text,
  priority integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.id,
         l.title,
         l.city,
         l.state,
         l.category::text,
         l.mode::text,
         COALESCE(NULLIF(l.cover_image_url, ''), l.image_urls[1]) AS cover_image_url,
         CASE
           WHEN hs.user_id IS NOT NULL THEN 1
           WHEN l.featured_enabled AND l.featured_expires_at > now() THEN 2
           ELSE 3
         END AS priority
  FROM public.listings l
  LEFT JOIN public.host_subscriptions hs
    ON hs.user_id = l.host_id
   AND hs.status = 'active'
   AND lower(coalesce(hs.tier,'')) = 'pro'
  WHERE l.status = 'published'
    AND l.published_at IS NOT NULL
    AND l.deleted_at IS NULL
    AND l.moderation_status = 'clear'
    AND COALESCE(NULLIF(l.cover_image_url, ''), l.image_urls[1]) IS NOT NULL
    AND l.title NOT ILIKE 'Demo%'
    AND l.title NOT ILIKE 'QA %'
    AND l.title NOT ILIKE 'QA\_%'
    AND l.title NOT ILIKE 'QA-%'
    AND l.title NOT ILIKE 'Test %'
    AND l.title NOT ILIKE 'E2E %'
    AND l.title NOT ILIKE 'Smoke %'
  ORDER BY priority ASC, l.published_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 12);
$$;

GRANT EXECUTE ON FUNCTION public.get_hero_listings(integer) TO anon, authenticated, service_role;