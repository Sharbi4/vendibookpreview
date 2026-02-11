
-- Table to capture voice agent conversation intents
CREATE TABLE public.voice_agent_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  intent_type TEXT, -- 'booking', 'search', 'question', 'other'
  category TEXT, -- food_truck, trailer, shared_kitchen, vendor_lot
  location TEXT,
  dates TEXT,
  budget TEXT,
  listing_mode TEXT, -- rent, buy
  summary TEXT NOT NULL,
  raw_transcript TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_agent_leads ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (including anonymous visitors)
CREATE POLICY "Anyone can insert voice agent leads"
  ON public.voice_agent_leads FOR INSERT
  WITH CHECK (true);

-- Admins can view all
CREATE POLICY "Admins can view all voice agent leads"
  ON public.voice_agent_leads FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Users can view their own
CREATE POLICY "Users can view own voice agent leads"
  ON public.voice_agent_leads FOR SELECT
  USING (auth.uid() = user_id);
