-- Table for saved searches / alerts
CREATE TABLE public.saved_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT,
  category TEXT,
  mode TEXT,
  location_text TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  radius_miles INTEGER DEFAULT 25,
  min_price NUMERIC,
  max_price NUMERIC,
  instant_book_only BOOLEAN DEFAULT false,
  amenities TEXT[] DEFAULT '{}',
  frequency TEXT DEFAULT 'weekly' CHECK (frequency IN ('instant', 'daily', 'weekly')),
  last_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

-- Policies for saved searches
CREATE POLICY "Users can view their own saved searches"
ON public.saved_searches
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved searches"
ON public.saved_searches
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved searches"
ON public.saved_searches
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved searches"
ON public.saved_searches
FOR DELETE
USING (auth.uid() = user_id);

-- Table for asset requests (concierge matching)
CREATE TABLE public.asset_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  email TEXT,
  phone TEXT,
  city TEXT NOT NULL,
  state TEXT,
  asset_type TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  budget_min NUMERIC,
  budget_max NUMERIC,
  notes TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'matched', 'closed')),
  assigned_to TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.asset_requests ENABLE ROW LEVEL SECURITY;

-- Policies for asset requests
CREATE POLICY "Users can view their own asset requests"
ON public.asset_requests
FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can create asset requests"
ON public.asset_requests
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own asset requests"
ON public.asset_requests
FOR UPDATE
USING (auth.uid() = user_id);

-- Admin can view all asset requests (using RPC function)
CREATE OR REPLACE FUNCTION public.get_all_asset_requests()
RETURNS SETOF public.asset_requests
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.asset_requests ORDER BY created_at DESC;
$$;

-- Admin can update any asset request
CREATE OR REPLACE FUNCTION public.update_asset_request_status(
  request_id UUID,
  new_status TEXT,
  new_assigned_to TEXT DEFAULT NULL,
  new_admin_notes TEXT DEFAULT NULL
)
RETURNS public.asset_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_request public.asset_requests;
BEGIN
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

-- Add response tracking columns to booking_requests for response time calculations
ALTER TABLE public.booking_requests 
ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ;

-- Create index for response time queries
CREATE INDEX IF NOT EXISTS idx_booking_requests_host_response 
ON public.booking_requests(host_id, created_at, responded_at);

-- Create a function to calculate average response time for a host
CREATE OR REPLACE FUNCTION public.get_host_avg_response_time(host_user_id UUID)
RETURNS INTERVAL
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    AVG(responded_at - created_at),
    INTERVAL '0 seconds'
  )
  FROM public.booking_requests
  WHERE host_id = host_user_id
    AND responded_at IS NOT NULL
    AND created_at > NOW() - INTERVAL '90 days';
$$;

-- Create a function to check if host is a fast responder (responds within 2 hours on average)
CREATE OR REPLACE FUNCTION public.is_fast_responder(host_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT AVG(EXTRACT(EPOCH FROM (responded_at - created_at))) < 7200 -- 2 hours in seconds
      FROM public.booking_requests
      WHERE host_id = host_user_id
        AND responded_at IS NOT NULL
        AND created_at > NOW() - INTERVAL '90 days'
      HAVING COUNT(*) >= 3 -- Need at least 3 responses to qualify
    ),
    false
  );
$$;