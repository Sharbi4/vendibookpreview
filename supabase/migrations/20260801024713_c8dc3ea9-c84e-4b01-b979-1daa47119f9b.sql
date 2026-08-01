CREATE OR REPLACE FUNCTION public.format_public_name(
  _first text,
  _last text,
  _fallback text DEFAULT 'Vendibook member'
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN COALESCE(btrim(_first), '') = '' THEN _fallback
    WHEN COALESCE(btrim(_last), '') = '' THEN btrim(_first)
    ELSE btrim(_first) || ' '
      || upper(left(split_part(btrim(regexp_replace(_last, '\s+', ' ', 'g')), ' ', 1), 1))
      || '.'
  END;
$$;