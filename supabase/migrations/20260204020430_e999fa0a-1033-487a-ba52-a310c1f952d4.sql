-- Add new columns for Micro-Storefront features
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS shop_policies JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS pinned_listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL;

-- Add index for pinned listing lookups
CREATE INDEX IF NOT EXISTS idx_profiles_pinned_listing ON public.profiles(pinned_listing_id) WHERE pinned_listing_id IS NOT NULL;

-- Drop existing function first to allow return type change
DROP FUNCTION IF EXISTS public.get_safe_host_profile(uuid);

-- Recreate function with new fields
CREATE FUNCTION public.get_safe_host_profile(host_user_id uuid)
 RETURNS TABLE(id uuid, full_name text, first_name text, last_name text, display_name text, username text, business_name text, public_city text, public_state text, avatar_url text, header_image_url text, identity_verified boolean, created_at timestamp with time zone, last_active_at timestamp with time zone, bio text, shop_policies jsonb, pinned_listing_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    p.last_active_at,
    p.bio,
    p.shop_policies,
    p.pinned_listing_id
  FROM public.profiles p
  WHERE p.id = host_user_id;
$function$;