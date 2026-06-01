
CREATE TABLE public.blog_campaign_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL,
  user_id UUID,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  resend_message_id TEXT,
  error_message TEXT,
  is_test BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX blog_campaign_sends_unique_recipient
  ON public.blog_campaign_sends (campaign_id, lower(email))
  WHERE is_test = false AND status = 'sent';

CREATE INDEX blog_campaign_sends_campaign_idx
  ON public.blog_campaign_sends (campaign_id, created_at DESC);

GRANT SELECT ON public.blog_campaign_sends TO authenticated;
GRANT ALL ON public.blog_campaign_sends TO service_role;

ALTER TABLE public.blog_campaign_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read blog campaign sends"
  ON public.blog_campaign_sends FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
