CREATE OR REPLACE FUNCTION public.get_video_walkthrough_slots(_listing_id uuid, _from timestamptz, _to timestamptz)
RETURNS TABLE(starts_at timestamptz, ends_at timestamptz, seller_timezone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH listing_seller AS (
    SELECT l.host_id seller_id, s.timezone, s.default_duration_minutes, s.minimum_notice_minutes, s.buffer_minutes
    FROM public.listings l JOIN public.seller_video_settings s ON s.user_id=l.host_id
    WHERE l.id=_listing_id AND l.status='published' AND s.enabled=true
  ), candidates AS (
    SELECT gs AS starts_at,
      gs + make_interval(mins=>ls.default_duration_minutes) AS ends_at,
      ls.*
    FROM listing_seller ls
    CROSS JOIN LATERAL generate_series(greatest(_from,now()+make_interval(mins=>ls.minimum_notice_minutes)),least(_to,_from+interval '31 days'),interval '15 minutes') gs
  )
  SELECT c.starts_at,c.ends_at,c.timezone
  FROM candidates c
  WHERE EXISTS (SELECT 1 FROM public.seller_video_availability a WHERE a.seller_id=c.seller_id AND a.active AND a.weekday=extract(dow FROM c.starts_at AT TIME ZONE c.timezone)::smallint AND (c.starts_at AT TIME ZONE c.timezone)::time>=a.start_local_time AND (c.ends_at AT TIME ZONE c.timezone)::time<=a.end_local_time)
    AND NOT EXISTS (SELECT 1 FROM public.seller_video_blackouts b WHERE b.seller_id=c.seller_id AND tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(c.starts_at,c.ends_at,'[)'))
    AND NOT EXISTS (SELECT 1 FROM public.listing_blocked_dates d WHERE d.listing_id=_listing_id AND d.blocked_date=(c.starts_at AT TIME ZONE c.timezone)::date)
    AND NOT EXISTS (SELECT 1 FROM public.video_walkthroughs w WHERE w.seller_id=c.seller_id AND w.status IN ('scheduled','rescheduled') AND tstzrange(w.starts_at-make_interval(mins=>c.buffer_minutes),w.ends_at+make_interval(mins=>c.buffer_minutes),'[)') && tstzrange(c.starts_at,c.ends_at,'[)'))
  ORDER BY c.starts_at LIMIT 400
$$;
GRANT EXECUTE ON FUNCTION public.get_video_walkthrough_slots(uuid, timestamptz, timestamptz) TO anon, authenticated;