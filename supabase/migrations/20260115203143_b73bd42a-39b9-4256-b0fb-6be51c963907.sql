-- Create table for availability alerts
CREATE TABLE public.availability_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  category TEXT,
  mode TEXT,
  radius_miles INTEGER DEFAULT 25,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notified_at TIMESTAMP WITH TIME ZONE,
  unsubscribed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.availability_alerts ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert alerts (public signup)
CREATE POLICY "Anyone can create availability alerts" 
ON public.availability_alerts 
FOR INSERT 
WITH CHECK (true);

-- Allow reading own alerts by email (for unsubscribe functionality)
CREATE POLICY "Anyone can view alerts by email" 
ON public.availability_alerts 
FOR SELECT 
USING (true);

-- Create index for efficient lookups
CREATE INDEX idx_availability_alerts_zip_code ON public.availability_alerts(zip_code);
CREATE INDEX idx_availability_alerts_email ON public.availability_alerts(email);