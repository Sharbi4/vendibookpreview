CREATE TABLE public.sale_checkout_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  listing_id UUID NOT NULL,
  email TEXT NOT NULL,
  total_price NUMERIC,
  request_only BOOLEAN NOT NULL DEFAULT false,
  resume_path TEXT,
  email_2h_sent_at TIMESTAMPTZ,
  email_24h_sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id)
);
GRANT SELECT, INSERT, UPDATE ON public.sale_checkout_drafts TO authenticated;
GRANT ALL ON public.sale_checkout_drafts TO service_role;
ALTER TABLE public.sale_checkout_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers manage own sale checkout drafts" ON public.sale_checkout_drafts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view sale checkout drafts" ON public.sale_checkout_drafts
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE INDEX idx_sale_checkout_drafts_pending ON public.sale_checkout_drafts(updated_at) WHERE completed_at IS NULL;
CREATE TRIGGER trg_sale_checkout_drafts_updated_at BEFORE UPDATE ON public.sale_checkout_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();