
-- Feedback submissions table
CREATE TABLE IF NOT EXISTS public.feedback_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  context_type TEXT NOT NULL, -- 'booking' | 'sale' | 'message_thread' | 'general'
  context_id UUID,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  nps INTEGER CHECK (nps >= 0 AND nps <= 10),
  message TEXT,
  email TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anon via token link) can insert their feedback
CREATE POLICY "Anyone can submit feedback"
ON public.feedback_submissions FOR INSERT
WITH CHECK (true);

-- Users can view their own feedback
CREATE POLICY "Users view own feedback"
ON public.feedback_submissions FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view/manage all
CREATE POLICY "Admins view all feedback"
ON public.feedback_submissions FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins update feedback"
ON public.feedback_submissions FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_feedback_context ON public.feedback_submissions(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON public.feedback_submissions(created_at DESC);

-- Track which interactions have already had feedback emails sent (idempotency)
CREATE TABLE IF NOT EXISTS public.feedback_email_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_type TEXT NOT NULL,
  context_id UUID NOT NULL,
  recipient_email TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(context_type, context_id)
);

ALTER TABLE public.feedback_email_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view feedback email log"
ON public.feedback_email_sent FOR SELECT
USING (public.is_admin(auth.uid()));
