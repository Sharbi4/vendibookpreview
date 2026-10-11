-- Owner decision 2026-10-06: rental checkout has no identity verification.
-- The member trust gate (guard_signup_phone_actions) still requires a verified
-- mobile number to book, but booking_requests no longer require the signup
-- identity check. Messaging, offers and purchases keep both checks.
DO $$
DECLARE definition text; patched text;
BEGIN
  SELECT pg_get_functiondef('public.guard_signup_phone_actions()'::regprocedure) INTO definition;
  patched := replace(definition,
    'if tg_table_name = ''listings'' and tg_op = ''INSERT'' then',
    'if (tg_table_name = ''listings'' and tg_op = ''INSERT'') or tg_table_name = ''booking_requests'' then');
  IF patched = definition AND position('tg_table_name = ''booking_requests'' then' in definition) = 0 THEN
    RAISE EXCEPTION 'guard_signup_phone_actions changed shape; patch not applied';
  END IF;
  EXECUTE patched;
END $$;

COMMENT ON FUNCTION public.guard_signup_phone_actions() IS
  'Member trust gate: phone for everything; identity for messaging, offers and purchases. Rental bookings (booking_requests) need phone only (owner decision 2026-10-06). Sellers acting on their own listings are exempt.';

-- Rental checkout pays by card through Square: record that on the agreed terms.
ALTER TABLE public.transaction_terms DROP CONSTRAINT IF EXISTS transaction_terms_payment_method_check;
ALTER TABLE public.transaction_terms ADD CONSTRAINT transaction_terms_payment_method_check
  CHECK (payment_method = ANY (ARRAY['card_checkout','paypal_checkout','paypal','stripe_card','pay_in_person','offer','other']));
