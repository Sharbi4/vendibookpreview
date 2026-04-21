
-- Concierge threads
CREATE TABLE public.concierge_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  topic TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  context JSONB DEFAULT '{}'::jsonb,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  unread_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_concierge_threads_user ON public.concierge_threads(user_id, last_message_at DESC);

ALTER TABLE public.concierge_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their threads" ON public.concierge_threads
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Users update their threads" ON public.concierge_threads
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert their threads" ON public.concierge_threads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_concierge_threads_updated
  BEFORE UPDATE ON public.concierge_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Concierge messages
CREATE TABLE public.concierge_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.concierge_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('ai','user','system')),
  content TEXT NOT NULL,
  actions JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_concierge_messages_thread ON public.concierge_messages(thread_id, created_at);
CREATE INDEX idx_concierge_messages_user ON public.concierge_messages(user_id, created_at DESC);

ALTER TABLE public.concierge_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their messages" ON public.concierge_messages
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Users insert their messages" ON public.concierge_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id AND sender_role = 'user');
CREATE POLICY "Users update their message read state" ON public.concierge_messages
  FOR UPDATE USING (auth.uid() = user_id);

-- Concierge events (orchestrator log)
CREATE TABLE public.concierge_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  entity_id UUID,
  payload JSONB DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_concierge_events_unprocessed ON public.concierge_events(created_at) WHERE processed_at IS NULL;
CREATE INDEX idx_concierge_events_user ON public.concierge_events(user_id, created_at DESC);

ALTER TABLE public.concierge_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view events" ON public.concierge_events
  FOR SELECT USING (public.is_admin(auth.uid()));
