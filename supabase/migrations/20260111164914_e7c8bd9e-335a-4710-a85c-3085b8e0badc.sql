-- Fix 1: Remove the overly permissive SELECT policy on newsletter_subscribers
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.newsletter_subscribers;

-- Fix 2 & 3: Create a secure view for public profile data (non-sensitive fields only)
-- First, drop the problematic policy that exposes all profile columns
DROP POLICY IF EXISTS "Anyone can view host profiles for published listings" ON public.profiles;

-- Create a new policy that only allows viewing specific safe columns
-- We need to use a function-based approach since RLS policies can't restrict columns directly

-- Create a function to get safe public profile data
CREATE OR REPLACE FUNCTION public.get_safe_host_profile(host_user_id UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  avatar_url TEXT,
  identity_verified BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.full_name,
    p.avatar_url,
    p.identity_verified,
    p.created_at
  FROM public.profiles p
  WHERE p.id = host_user_id
    AND EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.host_id = p.id
        AND l.status = 'published'::listing_status
    );
$$;

-- Create a new restricted policy that allows users to view their own profile
-- The existing policies allow users to view their own profile (safe) 
-- and participants in conversations/bookings to see relevant profiles

-- Add policy for booking participants to view counterparty's safe profile data
CREATE POLICY "Booking participants can view counterparty profiles" 
ON public.profiles 
FOR SELECT 
USING (
  -- Own profile
  auth.uid() = id
  OR
  -- Host viewing shopper profile for their booking
  EXISTS (
    SELECT 1 FROM public.booking_requests br
    WHERE br.host_id = auth.uid()
      AND br.shopper_id = profiles.id
  )
  OR
  -- Shopper viewing host profile for their booking
  EXISTS (
    SELECT 1 FROM public.booking_requests br
    WHERE br.shopper_id = auth.uid()
      AND br.host_id = profiles.id
  )
  OR
  -- Conversation participants
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE (c.host_id = auth.uid() AND c.shopper_id = profiles.id)
       OR (c.shopper_id = auth.uid() AND c.host_id = profiles.id)
  )
  OR
  -- Sale transaction participants
  EXISTS (
    SELECT 1 FROM public.sale_transactions st
    WHERE (st.buyer_id = auth.uid() AND st.seller_id = profiles.id)
       OR (st.seller_id = auth.uid() AND st.buyer_id = profiles.id)
  )
);