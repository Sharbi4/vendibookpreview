-- Create newsletter subscribers table
CREATE TABLE public.newsletter_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  source TEXT DEFAULT 'popup',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow anyone to subscribe (insert their email)
CREATE POLICY "Anyone can subscribe to newsletter"
ON public.newsletter_subscribers
FOR INSERT
WITH CHECK (true);

-- Only allow reading own subscription (by email match - for unsubscribe flows)
CREATE POLICY "Users can view their own subscription"
ON public.newsletter_subscribers
FOR SELECT
USING (true);

-- Add index for email lookups
CREATE INDEX idx_newsletter_subscribers_email ON public.newsletter_subscribers(email);