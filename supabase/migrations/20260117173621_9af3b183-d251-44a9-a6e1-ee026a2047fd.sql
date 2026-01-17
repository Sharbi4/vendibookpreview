-- Fix 1: Create a secure view for profiles that only exposes public fields
-- And update RLS to restrict access to sensitive data

-- First, drop the overly permissive policy
DROP POLICY IF EXISTS "Booking participants can view counterparty profiles" ON public.profiles;

-- Create a more restrictive policy that only allows viewing own profile
-- Other profile data should be accessed via the get_safe_host_profile function
CREATE POLICY "Authenticated users can view basic profile info via RPC"
ON public.profiles FOR SELECT
USING (
  auth.uid() = id
);

-- Fix 2: Fix asset_requests RLS to prevent viewing anonymous requests
DROP POLICY IF EXISTS "Users can view their own asset requests" ON public.asset_requests;

-- Only allow viewing own requests (authenticated users only)
CREATE POLICY "Users can view their own asset requests"
ON public.asset_requests FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Add admin policy for viewing all asset requests via RLS (backup to RPC)
CREATE POLICY "Admins can view all asset requests"
ON public.asset_requests FOR SELECT
USING (is_admin(auth.uid()));

-- Add admin policy for updating asset requests via RLS
CREATE POLICY "Admins can update asset requests"
ON public.asset_requests FOR UPDATE
USING (is_admin(auth.uid()));

-- Fix 3: Recreate admin RPC functions with authorization checks
CREATE OR REPLACE FUNCTION public.get_all_asset_requests()
RETURNS SETOF asset_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Authorization check: only admins can call this function
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  RETURN QUERY SELECT * FROM public.asset_requests ORDER BY created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_asset_request_status(
  request_id uuid,
  new_status text,
  new_assigned_to text DEFAULT NULL,
  new_admin_notes text DEFAULT NULL
)
RETURNS asset_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  updated_request public.asset_requests;
BEGIN
  -- Authorization check: only admins can call this function
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  UPDATE public.asset_requests
  SET 
    status = COALESCE(new_status, status),
    assigned_to = COALESCE(new_assigned_to, assigned_to),
    admin_notes = COALESCE(new_admin_notes, admin_notes),
    updated_at = now()
  WHERE id = request_id
  RETURNING * INTO updated_request;
  
  RETURN updated_request;
END;
$$;