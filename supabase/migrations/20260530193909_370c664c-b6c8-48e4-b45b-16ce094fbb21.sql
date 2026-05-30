
-- Marketing email system: The Vendibook Report
CREATE SEQUENCE IF NOT EXISTS public.vendibook_report_issue_seq START 1;

CREATE TYPE public.marketing_send_status AS ENUM ('draft','test_sent','test_approved','sending','sent','failed','canceled');
CREATE TYPE public.marketing_feedback_rating AS ENUM ('helpful','okay','not_for_me');
CREATE TYPE public.marketing_event_type AS ENUM ('delivered','opened','clicked','bounced','complained','unsubscribed','sent','deferred');

-- 1) email_sends ----------------------------------------------------------
CREATE TABLE public.email_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_number INTEGER NOT NULL DEFAULT nextval('public.vendibook_report_issue_seq'),
  subject_line TEXT NOT NULL,
  hero_headline TEXT NOT NULL,
  status public.marketing_send_status NOT NULL DEFAULT 'draft',
  recipient_count INTEGER,
  sent_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  resend_broadcast_id TEXT,
  composed_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  referral_rotation TEXT NOT NULL DEFAULT 'purchase',
  send_day TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_sends TO authenticated;
GRANT ALL ON public.email_sends TO service_role;
ALTER TABLE public.email_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage email_sends" ON public.email_sends FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) email_feedback -------------------------------------------------------
CREATE TABLE public.email_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  send_id UUID NOT NULL REFERENCES public.email_sends(id) ON DELETE CASCADE,
  user_id UUID,
  recipient_email TEXT,
  rating public.marketing_feedback_rating NOT NULL,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_email_feedback_send ON public.email_feedback(send_id);
GRANT SELECT, INSERT ON public.email_feedback TO authenticated;
GRANT ALL ON public.email_feedback TO service_role;
ALTER TABLE public.email_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read email_feedback" ON public.email_feedback FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
-- inserts only via service role (feedback-redirect edge function)

-- 3) email_events ---------------------------------------------------------
CREATE TABLE public.email_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  send_id UUID REFERENCES public.email_sends(id) ON DELETE SET NULL,
  user_id UUID,
  recipient_email TEXT,
  event_type public.marketing_event_type NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_email_events_send ON public.email_events(send_id);
CREATE INDEX idx_email_events_type ON public.email_events(event_type);
GRANT SELECT ON public.email_events TO authenticated;
GRANT ALL ON public.email_events TO service_role;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read email_events" ON public.email_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4) email_unsubscribes ---------------------------------------------------
CREATE TABLE public.email_unsubscribes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  email TEXT NOT NULL,
  reason TEXT,
  unsubscribed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_email_unsub_email ON public.email_unsubscribes(lower(email));
GRANT SELECT ON public.email_unsubscribes TO authenticated;
GRANT ALL ON public.email_unsubscribes TO service_role;
ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read unsubscribes" ON public.email_unsubscribes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5) email_test_sends -----------------------------------------------------
CREATE TABLE public.email_test_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  send_id UUID NOT NULL REFERENCES public.email_sends(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by UUID
);
CREATE INDEX idx_email_test_sends_send ON public.email_test_sends(send_id);
GRANT SELECT, INSERT, UPDATE ON public.email_test_sends TO authenticated;
GRANT ALL ON public.email_test_sends TO service_role;
ALTER TABLE public.email_test_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage test_sends" ON public.email_test_sends FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE TRIGGER trg_email_sends_updated_at
BEFORE UPDATE ON public.email_sends
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
