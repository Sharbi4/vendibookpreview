
-- =====================================================
-- SUPPORT TICKETS
-- =====================================================
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reference_code TEXT NOT NULL UNIQUE DEFAULT ('VB-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8))),

  -- Classification
  feature_area TEXT NOT NULL CHECK (feature_area IN (
    'listing_wizard','permit_path','purchase','rental','dashboard',
    'message','profile','listing_page','review','fraud','other'
  )),
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent','high','normal','low')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','waiting_for_user','in_progress','resolved','closed')),

  -- Content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  what_i_was_doing TEXT,
  what_happened_instead TEXT,
  is_blocking BOOLEAN NOT NULL DEFAULT false,
  reply_email TEXT,

  -- Related record IDs (optional; captured for context)
  related_listing_id UUID,
  related_sale_transaction_id UUID,
  related_booking_id UUID,
  related_permit_roadmap_id UUID,
  related_draft_id UUID,
  related_conversation_id UUID,
  related_review_id UUID,
  related_reported_user_id UUID,

  -- Diagnostic context (non-sensitive)
  page_url TEXT,
  wizard_step TEXT,
  transaction_status TEXT,
  payment_method TEXT,
  browser_info TEXT,
  device_type TEXT,
  last_error_id UUID,
  last_error_category TEXT,
  request_id TEXT,
  app_version TEXT,

  -- Support workflow
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_tickets_user ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX idx_support_tickets_feature_area ON public.support_tickets(feature_area);
CREATE INDEX idx_support_tickets_created ON public.support_tickets(created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own tickets"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can update tickets"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- SUPPORT TICKET MESSAGES (thread + internal notes)
-- =====================================================
CREATE TABLE public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('user','admin','system')),
  is_internal_note BOOLEAN NOT NULL DEFAULT false,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_ticket_messages_ticket ON public.support_ticket_messages(ticket_id, created_at);

GRANT SELECT, INSERT ON public.support_ticket_messages TO authenticated;
GRANT ALL ON public.support_ticket_messages TO service_role;

ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Users can view non-internal messages on their own tickets; admins see all.
CREATE POLICY "Ticket messages visibility"
  ON public.support_ticket_messages FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR (
      is_internal_note = false
      AND EXISTS (
        SELECT 1 FROM public.support_tickets t
        WHERE t.id = support_ticket_messages.ticket_id
          AND t.user_id = auth.uid()
      )
    )
  );

-- Users can reply on their own tickets (never as internal note); admins can add anything.
CREATE POLICY "Users can reply on their tickets"
  ON public.support_ticket_messages FOR INSERT TO authenticated
  WITH CHECK (
    (
      author_role = 'user'
      AND is_internal_note = false
      AND author_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.support_tickets t
        WHERE t.id = ticket_id AND t.user_id = auth.uid()
      )
    )
    OR public.is_admin(auth.uid())
  );

-- =====================================================
-- SUPPORT TICKET ATTACHMENTS
-- =====================================================
CREATE TABLE public.support_ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content_type TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_ticket_attachments_ticket ON public.support_ticket_attachments(ticket_id);

GRANT SELECT, INSERT ON public.support_ticket_attachments TO authenticated;
GRANT ALL ON public.support_ticket_attachments TO service_role;

ALTER TABLE public.support_ticket_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attachment visibility follows ticket"
  ON public.support_ticket_attachments FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_ticket_attachments.ticket_id
        AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users attach to their own tickets"
  ON public.support_ticket_attachments FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.support_tickets t
        WHERE t.id = ticket_id AND t.user_id = auth.uid()
      )
    )
  );
