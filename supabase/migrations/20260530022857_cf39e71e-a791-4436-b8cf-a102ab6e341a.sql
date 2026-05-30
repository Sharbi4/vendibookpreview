
-- Look up a pending feedback row by its email token (anonymous-safe).
CREATE OR REPLACE FUNCTION public.get_feedback_by_token(_token text)
RETURNS TABLE (
  id uuid,
  context_type text,
  context_id uuid,
  email text,
  rating int,
  nps int,
  message text,
  metadata jsonb,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, context_type, context_id, email, rating, nps, message, metadata, created_at
  FROM public.feedback_submissions
  WHERE metadata->>'token' = _token
  ORDER BY created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_feedback_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_feedback_by_token(text) TO anon, authenticated;

-- Submit feedback for a token (anonymous-safe). Only updates the matching row.
CREATE OR REPLACE FUNCTION public.submit_feedback_by_token(
  _token text,
  _rating int,
  _nps int,
  _message text,
  _business_type text,
  _can_share boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _existing jsonb;
BEGIN
  IF _token IS NULL OR length(_token) < 8 THEN
    RAISE EXCEPTION 'invalid_token';
  END IF;

  SELECT id, metadata INTO _id, _existing
  FROM public.feedback_submissions
  WHERE metadata->>'token' = _token
  ORDER BY created_at DESC
  LIMIT 1;

  IF _id IS NULL THEN
    RAISE EXCEPTION 'token_not_found';
  END IF;

  UPDATE public.feedback_submissions
  SET rating  = COALESCE(_rating, rating),
      nps     = COALESCE(_nps, nps),
      message = COALESCE(NULLIF(_message, ''), message),
      metadata = COALESCE(_existing, '{}'::jsonb)
        || jsonb_build_object(
          'token', _token,
          'status', 'submitted',
          'business_type', NULLIF(_business_type, ''),
          'can_share', COALESCE(_can_share, false)
        )
  WHERE id = _id;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_feedback_by_token(text, int, int, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_feedback_by_token(text, int, int, text, text, boolean) TO anon, authenticated;
