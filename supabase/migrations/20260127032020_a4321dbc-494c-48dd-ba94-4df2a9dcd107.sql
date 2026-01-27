-- Add last_active_at column to profiles table (if not already added)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at timestamp with time zone DEFAULT now();

-- Drop and recreate the get_safe_host_profile function with the new column
DROP FUNCTION IF EXISTS public.get_safe_host_profile(uuid);

CREATE FUNCTION public.get_safe_host_profile(host_user_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  first_name text,
  last_name text,
  display_name text,
  username text,
  business_name text,
  public_city text,
  public_state text,
  avatar_url text,
  header_image_url text,
  identity_verified boolean,
  created_at timestamptz,
  last_active_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.id,
    p.full_name,
    p.first_name,
    p.last_name,
    p.display_name,
    p.username,
    p.business_name,
    p.public_city,
    p.public_state,
    p.avatar_url,
    p.header_image_url,
    p.identity_verified,
    p.created_at,
    p.last_active_at
  FROM public.profiles p
  WHERE p.id = host_user_id;
$$;