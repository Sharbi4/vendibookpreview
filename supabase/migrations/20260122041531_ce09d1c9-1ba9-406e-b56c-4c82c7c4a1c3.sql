-- Create a function to get public host verification status
-- This allows anyone to check if a host is identity verified without exposing other profile data
CREATE OR REPLACE FUNCTION public.get_host_verification_status(host_ids uuid[])
RETURNS TABLE(id uuid, identity_verified boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, COALESCE(p.identity_verified, false) as identity_verified
  FROM profiles p
  WHERE p.id = ANY(host_ids);
$$;

-- Grant execute permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.get_host_verification_status(uuid[]) TO anon;
GRANT EXECUTE ON FUNCTION public.get_host_verification_status(uuid[]) TO authenticated;