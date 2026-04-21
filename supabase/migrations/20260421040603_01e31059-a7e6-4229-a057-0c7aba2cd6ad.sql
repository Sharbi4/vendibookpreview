-- Track booking drafts for abandonment recovery emails
CREATE TABLE public.booking_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  listing_id UUID NOT NULL,
  email TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  total_price NUMERIC,
  recovery_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  email_2h_sent_at TIMESTAMPTZ,
  email_24h_sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  abandoned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id)
);

CREATE INDEX idx_booking_drafts_user ON public.booking_drafts(user_id);
CREATE INDEX idx_booking_drafts_pending_2h ON public.booking_drafts(updated_at)
  WHERE completed_at IS NULL AND email_2h_sent_at IS NULL;
CREATE INDEX idx_booking_drafts_pending_24h ON public.booking_drafts(updated_at)
  WHERE completed_at IS NULL AND email_24h_sent_at IS NULL;

ALTER TABLE public.booking_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own booking drafts"
  ON public.booking_drafts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all booking drafts"
  ON public.booking_drafts FOR SELECT
  USING (is_admin(auth.uid()));

CREATE TRIGGER trg_booking_drafts_updated_at
  BEFORE UPDATE ON public.booking_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();