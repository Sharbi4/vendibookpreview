-- Show the direct booking action only when the seller has enabled it and
-- published at least one active availability window.
CREATE OR REPLACE FUNCTION public.listing_video_walkthrough_enabled(_listing_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.listings l
    JOIN public.seller_video_settings s ON s.user_id = l.host_id
    WHERE l.id = _listing_id
      AND l.status = 'published'
      AND s.enabled = true
      AND EXISTS (
        SELECT 1 FROM public.seller_video_availability a
        WHERE a.seller_id = l.host_id AND a.active = true
      )
  )
$$;
REVOKE ALL ON FUNCTION public.listing_video_walkthrough_enabled(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listing_video_walkthrough_enabled(uuid) TO anon, authenticated;

-- Existing sellers receive one dashboard notification pointing to the
-- scheduling control. The dashboard also keeps a live reminder until their
-- settings and at least one availability window are saved.
INSERT INTO public.notifications (user_id, type, title, message, link)
SELECT seller.user_id,
       'walkthrough_setup_reminder',
       'Turn on video walkthroughs for your listings',
       'Buyers can book a live walkthrough directly when you enable it and add your available hours.',
       '/dashboard/account/scheduling'
FROM (
  SELECT DISTINCT l.host_id AS user_id
  FROM public.listings l
  WHERE l.status = 'published'
    AND COALESCE(l.unlisted, false) = false
    AND NOT EXISTS (
      SELECT 1
      FROM public.seller_video_settings s
      WHERE s.user_id = l.host_id
        AND s.enabled = true
        AND EXISTS (
          SELECT 1 FROM public.seller_video_availability a
          WHERE a.seller_id = l.host_id AND a.active = true
        )
    )
) seller
WHERE NOT EXISTS (
  SELECT 1 FROM public.notifications n
  WHERE n.user_id = seller.user_id
    AND n.type = 'walkthrough_setup_reminder'
    AND n.link = '/dashboard/account/scheduling'
);
