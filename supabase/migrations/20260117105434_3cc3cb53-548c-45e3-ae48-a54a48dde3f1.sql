-- Fix get_host_avg_response_time function to include search_path
CREATE OR REPLACE FUNCTION public.get_host_avg_response_time(host_user_id uuid)
RETURNS interval
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    AVG(first_response_at - created_at) FILTER (WHERE first_response_at IS NOT NULL),
    INTERVAL '0'
  )
  FROM public.booking_requests
  WHERE host_id = host_user_id
  AND first_response_at IS NOT NULL
$$;

-- Fix is_fast_responder function to include search_path
CREATE OR REPLACE FUNCTION public.is_fast_responder(host_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 3600) < 24
      FROM public.booking_requests
      WHERE host_id = host_user_id
      AND first_response_at IS NOT NULL
      HAVING COUNT(*) >= 3
    ),
    false
  )
$$;