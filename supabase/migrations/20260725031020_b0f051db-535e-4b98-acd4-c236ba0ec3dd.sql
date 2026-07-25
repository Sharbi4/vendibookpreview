ALTER TABLE public.host_subscriptions
  ADD COLUMN IF NOT EXISTS getting_started_sent_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_host_subscriptions_getting_started_pending
  ON public.host_subscriptions (created_at)
  WHERE getting_started_sent_at IS NULL;