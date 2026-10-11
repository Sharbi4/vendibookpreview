-- The guard runs only via trigger; direct invocation is never legitimate.
REVOKE EXECUTE ON FUNCTION public.validate_booking_request_insert() FROM PUBLIC, anon, authenticated;