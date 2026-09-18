CREATE TABLE public.legal_acceptances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  document_slug text NOT NULL,
  document_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  surface text,
  route text,
  related_entity_type text,
  related_entity_id uuid,
  user_agent text,
  granted_permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_legal_acceptances_user ON public.legal_acceptances (user_id, document_slug, accepted_at DESC);
CREATE INDEX idx_legal_acceptances_entity ON public.legal_acceptances (related_entity_type, related_entity_id);
CREATE INDEX idx_legal_acceptances_doc ON public.legal_acceptances (document_slug, document_version);

GRANT SELECT, INSERT ON public.legal_acceptances TO authenticated;
GRANT ALL ON public.legal_acceptances TO service_role;

ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert their own legal acceptances"
ON public.legal_acceptances FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users read their own legal acceptances"
ON public.legal_acceptances FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins read all legal acceptances"
ON public.legal_acceptances FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));