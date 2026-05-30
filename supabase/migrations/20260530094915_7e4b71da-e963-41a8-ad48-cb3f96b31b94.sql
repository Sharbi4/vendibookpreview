DROP TRIGGER IF EXISTS validate_booking_availability_trigger ON public.booking_requests;

CREATE TRIGGER validate_booking_availability_trigger
BEFORE INSERT OR UPDATE OF start_date, end_date, hourly_slots, slot_number, status, is_hourly_booking
ON public.booking_requests
FOR EACH ROW
EXECUTE FUNCTION public.validate_booking_availability();