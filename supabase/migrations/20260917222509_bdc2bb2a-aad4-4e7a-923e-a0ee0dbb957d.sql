CREATE OR REPLACE FUNCTION public.listing_video_walkthrough_enabled(_listing_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.listings l
    JOIN public.seller_video_settings s ON s.user_id=l.host_id
    WHERE l.id=_listing_id AND l.status='published' AND s.enabled=true
  )
$$;
REVOKE ALL ON FUNCTION public.listing_video_walkthrough_enabled(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listing_video_walkthrough_enabled(uuid) TO anon, authenticated;