CREATE OR REPLACE FUNCTION public.get_listing_busy_slots(_listing_id uuid)
RETURNS TABLE (
  start_date date,
  end_date date,
  start_time time without time zone,
  end_time time without time zone,
  is_hourly_booking boolean,
  slot_number integer,
  hourly_slots jsonb,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    br.start_date,
    br.end_date,
    br.start_time,
    br.end_time,
    COALESCE(br.is_hourly_booking, false),
    br.slot_number,
    to_jsonb(br.hourly_slots),
    br.status::text
  FROM public.booking_requests br
  WHERE br.listing_id = _listing_id
    AND br.payment_status = 'paid'
    AND br.status IN ('pending', 'approved', 'completed')
    AND br.end_date >= (CURRENT_DATE - INTERVAL '1 day');
$$;

GRANT EXECUTE ON FUNCTION public.get_listing_busy_slots(uuid) TO anon, authenticated, service_role;