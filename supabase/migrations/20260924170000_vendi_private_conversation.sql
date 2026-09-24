-- Listing interviews are private account data, never part of public listing rows.
CREATE TABLE IF NOT EXISTS public.vendi_listing_messages (
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  id text NOT NULL CHECK (length(id) BETWEEN 1 AND 100),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'vendi')),
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 20000),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (listing_id, id)
);
CREATE INDEX IF NOT EXISTS vendi_listing_messages_history
  ON public.vendi_listing_messages(listing_id, created_at, id);
ALTER TABLE public.vendi_listing_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vendi_listing_messages FROM anon;
GRANT SELECT, INSERT ON public.vendi_listing_messages TO authenticated;
DROP POLICY IF EXISTS vendi_history_owner_read ON public.vendi_listing_messages;
CREATE POLICY vendi_history_owner_read ON public.vendi_listing_messages
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS vendi_history_owner_append ON public.vendi_listing_messages;
CREATE POLICY vendi_history_owner_append ON public.vendi_listing_messages
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.listings l WHERE l.id = listing_id
      AND l.host_id = auth.uid() AND l.deleted_at IS NULL
    )
  );

-- Keep screening requirements atomic: a failed insert must not erase the old set.
CREATE OR REPLACE FUNCTION public.vendi_save_required_documents(p_listing_id uuid, p_documents public.document_type[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM 1 FROM public.listings WHERE id = p_listing_id AND host_id = auth.uid()
    AND status = 'draft' AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Draft unavailable or not owned by this account'; END IF;
  DELETE FROM public.listing_required_documents WHERE listing_id = p_listing_id
    AND NOT (document_type = ANY(coalesce(p_documents, ARRAY[]::public.document_type[])));
  INSERT INTO public.listing_required_documents(listing_id, document_type, is_required, deadline_type)
    SELECT p_listing_id, doc, true, 'before_approval'::public.document_deadline_type
    FROM (SELECT DISTINCT unnest(coalesce(p_documents, ARRAY[]::public.document_type[])) AS doc) d
    WHERE NOT EXISTS (SELECT 1 FROM public.listing_required_documents r WHERE r.listing_id = p_listing_id AND r.document_type = d.doc);
END $$;
REVOKE ALL ON FUNCTION public.vendi_save_required_documents(uuid, public.document_type[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vendi_save_required_documents(uuid, public.document_type[]) TO authenticated;
