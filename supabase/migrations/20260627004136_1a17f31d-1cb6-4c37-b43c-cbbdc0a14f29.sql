
-- =========================================================
-- Permits Dashboard: saved roadmaps, per-item permit data, document metadata,
-- plus storage RLS for the private permit-documents bucket.
-- =========================================================

-- ---------- saved_permit_roadmaps ----------
CREATE TABLE public.saved_permit_roadmaps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  roadmap_key TEXT NOT NULL,
  state_code TEXT NOT NULL,
  city TEXT,
  business_type TEXT,
  label TEXT,
  result_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT saved_permit_roadmaps_user_key_unique UNIQUE (user_id, roadmap_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_permit_roadmaps TO authenticated;
GRANT ALL ON public.saved_permit_roadmaps TO service_role;

ALTER TABLE public.saved_permit_roadmaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own saved roadmaps"
  ON public.saved_permit_roadmaps FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert their own saved roadmaps"
  ON public.saved_permit_roadmaps FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own saved roadmaps"
  ON public.saved_permit_roadmaps FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete their own saved roadmaps"
  ON public.saved_permit_roadmaps FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX saved_permit_roadmaps_user_idx
  ON public.saved_permit_roadmaps (user_id, updated_at DESC);

CREATE TRIGGER saved_permit_roadmaps_set_updated_at
  BEFORE UPDATE ON public.saved_permit_roadmaps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- permit_items ----------
CREATE TABLE public.permit_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  roadmap_id UUID NOT NULL REFERENCES public.saved_permit_roadmaps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started','in_progress','submitted','approved','expired')),
  permit_number TEXT,
  issuing_agency TEXT,
  notes TEXT,
  issue_date DATE,
  expires_on DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT permit_items_roadmap_item_unique UNIQUE (roadmap_id, item_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.permit_items TO authenticated;
GRANT ALL ON public.permit_items TO service_role;

ALTER TABLE public.permit_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own permit items"
  ON public.permit_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert their own permit items"
  ON public.permit_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own permit items"
  ON public.permit_items FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete their own permit items"
  ON public.permit_items FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX permit_items_user_expires_idx
  ON public.permit_items (user_id, expires_on);
CREATE INDEX permit_items_roadmap_idx
  ON public.permit_items (roadmap_id);

CREATE TRIGGER permit_items_set_updated_at
  BEFORE UPDATE ON public.permit_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- permit_documents ----------
CREATE TABLE public.permit_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  roadmap_id UUID NOT NULL REFERENCES public.saved_permit_roadmaps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.permit_documents TO authenticated;
GRANT ALL ON public.permit_documents TO service_role;

ALTER TABLE public.permit_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own permit documents"
  ON public.permit_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert their own permit documents"
  ON public.permit_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete their own permit documents"
  ON public.permit_documents FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX permit_documents_roadmap_item_idx
  ON public.permit_documents (roadmap_id, item_key);

-- ---------- Storage RLS for permit-documents (private bucket) ----------
-- Object key convention: {user_id}/{roadmap_id}/{item_key}/{uuid}-{filename}

CREATE POLICY "Users read their own permit-documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'permit-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users upload their own permit-documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'permit-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users update their own permit-documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'permit-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete their own permit-documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'permit-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
