-- Create table to store synced Zendesk ticket comments
CREATE TABLE public.zendesk_ticket_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES public.sale_transactions(id) ON DELETE CASCADE,
  zendesk_ticket_id TEXT NOT NULL,
  zendesk_comment_id TEXT NOT NULL UNIQUE,
  author_name TEXT,
  author_email TEXT,
  author_role TEXT, -- 'agent', 'admin', 'end-user'
  body TEXT NOT NULL,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  zendesk_created_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.zendesk_ticket_comments ENABLE ROW LEVEL SECURITY;

-- Only admins can view comments
CREATE POLICY "Admins can view all ticket comments"
  ON public.zendesk_ticket_comments
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Service role can insert (for webhook)
CREATE POLICY "Service role can insert comments"
  ON public.zendesk_ticket_comments
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_zendesk_comments_transaction ON public.zendesk_ticket_comments(transaction_id);
CREATE INDEX idx_zendesk_comments_ticket ON public.zendesk_ticket_comments(zendesk_ticket_id);