-- Create analytics_events table for persistent funnel tracking
CREATE TABLE public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  event_name TEXT NOT NULL,
  event_category TEXT,
  metadata JSONB DEFAULT '{}',
  route TEXT,
  city TEXT,
  listing_id UUID REFERENCES public.listings(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_analytics_events_event_name ON public.analytics_events(event_name);
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX idx_analytics_events_category ON public.analytics_events(event_category);
CREATE INDEX idx_analytics_events_city ON public.analytics_events(city);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert events (tracking)
CREATE POLICY "Anyone can track events" 
ON public.analytics_events 
FOR INSERT 
WITH CHECK (true);

-- Only admins can view analytics events
CREATE POLICY "Admins can view all analytics events" 
ON public.analytics_events 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Create admin_notes table for internal notes on any entity
CREATE TABLE public.admin_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'listing', 'user', 'transaction', 'booking', etc.
  entity_id UUID NOT NULL,
  note TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_admin_notes_entity ON public.admin_notes(entity_type, entity_id);
CREATE INDEX idx_admin_notes_created_at ON public.admin_notes(created_at DESC);

-- Enable RLS
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;

-- Only admins can manage notes
CREATE POLICY "Admins can create notes" 
ON public.admin_notes 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can view notes" 
ON public.admin_notes 
FOR SELECT 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update notes" 
ON public.admin_notes 
FOR UPDATE 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete notes" 
ON public.admin_notes 
FOR DELETE 
USING (is_admin(auth.uid()));

-- Create risk_flags table for fraud monitoring
CREATE TABLE public.risk_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  listing_id UUID REFERENCES public.listings(id),
  flag_type TEXT NOT NULL, -- 'spam_messages', 'duplicate_listing', 'suspicious_payout', 'identity_mismatch'
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  description TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'investigating', 'resolved', 'dismissed'
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_risk_flags_status ON public.risk_flags(status);
CREATE INDEX idx_risk_flags_severity ON public.risk_flags(severity);
CREATE INDEX idx_risk_flags_user_id ON public.risk_flags(user_id);
CREATE INDEX idx_risk_flags_created_at ON public.risk_flags(created_at DESC);

-- Enable RLS
ALTER TABLE public.risk_flags ENABLE ROW LEVEL SECURITY;

-- Only admins can manage risk flags
CREATE POLICY "Admins can create risk flags" 
ON public.risk_flags 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can view risk flags" 
ON public.risk_flags 
FOR SELECT 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update risk flags" 
ON public.risk_flags 
FOR UPDATE 
USING (is_admin(auth.uid()));

-- Add nudge tracking columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS draft_nudge_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS stripe_nudge_sent_at TIMESTAMP WITH TIME ZONE;

-- Add nudge tracking to booking_requests
ALTER TABLE public.booking_requests
ADD COLUMN IF NOT EXISTS host_nudge_sent_at TIMESTAMP WITH TIME ZONE;

-- Create trigger for updated_at on risk_flags
CREATE TRIGGER update_risk_flags_updated_at
BEFORE UPDATE ON public.risk_flags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();