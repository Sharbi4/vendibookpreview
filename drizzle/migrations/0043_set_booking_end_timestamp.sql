CREATE OR REPLACE FUNCTION public.set_booking_end_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.end_date IS NOT NULL THEN
    NEW.booking_end_timestamp := public.calculate_booking_end_timestamp(NEW.end_date, NEW.hourly_slots);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS a00_set_booking_end_timestamp ON public.booking_requests;
CREATE TRIGGER a00_set_booking_end_timestamp
BEFORE INSERT OR UPDATE OF end_date, hourly_slots ON public.booking_requests
FOR EACH ROW EXECUTE FUNCTION public.set_booking_end_timestamp();

UPDATE public.booking_requests
SET booking_end_timestamp = public.calculate_booking_end_timestamp(end_date, hourly_slots)
WHERE id = 'ecb9fbb8-9c87-4b92-a625-6537ed5e00fc' AND booking_end_timestamp IS NULL;