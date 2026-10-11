CREATE OR REPLACE FUNCTION public.get_public_feature_flag(flag_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT enabled
  FROM public.app_feature_flags
  WHERE key = flag_key
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_feature_flag(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_feature_flag(text) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Anyone can read feature flags" ON public.app_feature_flags;
REVOKE SELECT ON public.app_feature_flags FROM anon;

CREATE POLICY "Authenticated users can read feature flags"
  ON public.app_feature_flags
  FOR SELECT
  TO authenticated
  USING (true);