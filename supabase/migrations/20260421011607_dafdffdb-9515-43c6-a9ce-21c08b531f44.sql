
-- SMS Subscriptions
CREATE TABLE public.sms_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  phone_number TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  opted_in BOOLEAN NOT NULL DEFAULT true,
  opted_out_at TIMESTAMPTZ,
  accepts_transactional BOOLEAN NOT NULL DEFAULT true,
  accepts_marketing BOOLEAN NOT NULL DEFAULT false,
  accepts_alerts BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_subs_phone ON public.sms_subscriptions(phone_number);

ALTER TABLE public.sms_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sms subscription"
  ON public.sms_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own sms subscription"
  ON public.sms_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own sms subscription"
  ON public.sms_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own sms subscription"
  ON public.sms_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all sms subscriptions"
  ON public.sms_subscriptions FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_sms_subs_updated
  BEFORE UPDATE ON public.sms_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SMS Send Log
CREATE TABLE public.sms_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  recipient_phone TEXT NOT NULL,
  template_name TEXT NOT NULL,
  message_body TEXT NOT NULL,
  twilio_message_sid TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_log_user ON public.sms_send_log(user_id, created_at DESC);
CREATE INDEX idx_sms_log_status ON public.sms_send_log(status, created_at DESC);

ALTER TABLE public.sms_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sms log"
  ON public.sms_send_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all sms log"
  ON public.sms_send_log FOR SELECT
  USING (public.is_admin(auth.uid()));

-- SMS Inbound Messages
CREATE TABLE public.sms_inbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_phone TEXT NOT NULL,
  to_phone TEXT NOT NULL,
  body TEXT NOT NULL,
  twilio_message_sid TEXT UNIQUE,
  matched_user_id UUID,
  action_taken TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_inbound_phone ON public.sms_inbound_messages(from_phone, created_at DESC);

ALTER TABLE public.sms_inbound_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view inbound sms"
  ON public.sms_inbound_messages FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Quiet hours on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS quiet_hours_start TIME DEFAULT '21:00',
  ADD COLUMN IF NOT EXISTS quiet_hours_end TIME DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS quiet_hours_timezone TEXT DEFAULT 'America/New_York';
