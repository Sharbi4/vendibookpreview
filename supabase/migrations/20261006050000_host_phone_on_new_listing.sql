-- Owner decision 2026-10-06 (option b): sellers stay un-walled, but an
-- unverified existing host who starts a NEW listing sees the phone form
-- instead of a raw trigger error. signup_phone_status() reports
-- host_phone_required; PhoneVerificationPrompt shows the form on
-- create-listing routes only. The server gate is unchanged.
DO $$
DECLARE d text; p text;
BEGIN
  SELECT pg_get_functiondef('public.signup_phone_status()'::regprocedure) INTO d;
  p := replace(d, $o$    'identity_required', case when is_host then false else public.signup_identity_required() end,$o$,
                  $n$    'identity_required', case when is_host then false else public.signup_identity_required() end,
    -- Hosts are never walled, but starting a NEW listing still needs a
    -- verified phone; the UI shows the form on create-listing pages.
    'host_phone_required', is_host and public.signup_phone_required(),$n$);
  IF p = d THEN RAISE EXCEPTION 'signup_phone_status changed shape'; END IF;
  EXECUTE p;
END $$;
