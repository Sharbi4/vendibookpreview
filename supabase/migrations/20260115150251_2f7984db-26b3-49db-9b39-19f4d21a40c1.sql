-- Create saved_addresses table for users to store frequently used delivery addresses
CREATE TABLE public.saved_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Home',
  full_address TEXT NOT NULL,
  street TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'United States',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_addresses ENABLE ROW LEVEL SECURITY;

-- Users can view their own saved addresses
CREATE POLICY "Users can view their own saved addresses"
ON public.saved_addresses
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own saved addresses
CREATE POLICY "Users can create their own saved addresses"
ON public.saved_addresses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own saved addresses
CREATE POLICY "Users can update their own saved addresses"
ON public.saved_addresses
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own saved addresses
CREATE POLICY "Users can delete their own saved addresses"
ON public.saved_addresses
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_saved_addresses_user_id ON public.saved_addresses(user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_saved_addresses_updated_at
BEFORE UPDATE ON public.saved_addresses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();