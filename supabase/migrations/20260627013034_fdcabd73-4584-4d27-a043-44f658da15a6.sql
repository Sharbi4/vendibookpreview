
-- Phase 1: soft-delete + rename for permit roadmaps and documents.
ALTER TABLE public.saved_permit_roadmaps
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.permit_documents
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS saved_permit_roadmaps_user_deleted_idx
  ON public.saved_permit_roadmaps (user_id, deleted_at);

CREATE INDEX IF NOT EXISTS permit_documents_user_deleted_idx
  ON public.permit_documents (user_id, deleted_at);

-- Soft-delete a roadmap (owner-only). Cascade-marks its documents.
CREATE OR REPLACE FUNCTION public.soft_delete_permit_roadmap(p_roadmap_id uuid)
RETURNS public.saved_permit_roadmaps
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.saved_permit_roadmaps;
BEGIN
  UPDATE public.saved_permit_roadmaps
     SET deleted_at = now(),
         updated_at = now()
   WHERE id = p_roadmap_id
     AND user_id = auth.uid()
     AND deleted_at IS NULL
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Roadmap not found or already deleted';
  END IF;

  UPDATE public.permit_documents
     SET deleted_at = now()
   WHERE roadmap_id = p_roadmap_id
     AND user_id = auth.uid()
     AND deleted_at IS NULL;

  RETURN v_row;
END;
$$;

-- Restore a soft-deleted roadmap (and its documents) within the 7-day window.
CREATE OR REPLACE FUNCTION public.restore_permit_roadmap(p_roadmap_id uuid)
RETURNS public.saved_permit_roadmaps
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.saved_permit_roadmaps;
BEGIN
  UPDATE public.saved_permit_roadmaps
     SET deleted_at = NULL,
         updated_at = now()
   WHERE id = p_roadmap_id
     AND user_id = auth.uid()
     AND deleted_at IS NOT NULL
     AND deleted_at > now() - INTERVAL '7 days'
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Cannot restore — roadmap missing or restore window expired';
  END IF;

  UPDATE public.permit_documents
     SET deleted_at = NULL
   WHERE roadmap_id = p_roadmap_id
     AND user_id = auth.uid()
     AND deleted_at IS NOT NULL;

  RETURN v_row;
END;
$$;

-- Soft-delete a single permit document.
CREATE OR REPLACE FUNCTION public.soft_delete_permit_document(p_document_id uuid)
RETURNS public.permit_documents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.permit_documents;
BEGIN
  UPDATE public.permit_documents
     SET deleted_at = now()
   WHERE id = p_document_id
     AND user_id = auth.uid()
     AND deleted_at IS NULL
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Document not found or already deleted';
  END IF;

  RETURN v_row;
END;
$$;

-- Restore a single soft-deleted document (parent roadmap must not be deleted).
CREATE OR REPLACE FUNCTION public.restore_permit_document(p_document_id uuid)
RETURNS public.permit_documents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.permit_documents;
BEGIN
  UPDATE public.permit_documents
     SET deleted_at = NULL
   WHERE id = p_document_id
     AND user_id = auth.uid()
     AND deleted_at IS NOT NULL
     AND deleted_at > now() - INTERVAL '7 days'
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Cannot restore — document missing or restore window expired';
  END IF;

  RETURN v_row;
END;
$$;

-- Rename a roadmap label.
CREATE OR REPLACE FUNCTION public.rename_permit_roadmap(p_roadmap_id uuid, p_label text)
RETURNS public.saved_permit_roadmaps
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.saved_permit_roadmaps;
  v_label text := trim(coalesce(p_label, ''));
BEGIN
  IF length(v_label) = 0 THEN
    RAISE EXCEPTION 'Label cannot be empty';
  END IF;
  IF length(v_label) > 120 THEN
    RAISE EXCEPTION 'Label is too long (max 120 characters)';
  END IF;

  UPDATE public.saved_permit_roadmaps
     SET label = v_label,
         updated_at = now()
   WHERE id = p_roadmap_id
     AND user_id = auth.uid()
     AND deleted_at IS NULL
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Roadmap not found';
  END IF;

  RETURN v_row;
END;
$$;

-- Rename a document file_name.
CREATE OR REPLACE FUNCTION public.rename_permit_document(p_document_id uuid, p_file_name text)
RETURNS public.permit_documents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.permit_documents;
  v_name text := trim(coalesce(p_file_name, ''));
BEGIN
  IF length(v_name) = 0 THEN
    RAISE EXCEPTION 'File name cannot be empty';
  END IF;
  IF length(v_name) > 200 THEN
    RAISE EXCEPTION 'File name is too long (max 200 characters)';
  END IF;

  UPDATE public.permit_documents
     SET file_name = v_name
   WHERE id = p_document_id
     AND user_id = auth.uid()
     AND deleted_at IS NULL
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Document not found';
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_permit_roadmap(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_permit_roadmap(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_permit_document(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_permit_document(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rename_permit_roadmap(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rename_permit_document(uuid, text) TO authenticated;
