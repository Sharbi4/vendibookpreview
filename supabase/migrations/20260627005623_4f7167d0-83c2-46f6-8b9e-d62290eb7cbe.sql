
-- 1. Allow multiple roadmaps per (user, city, business_type) — user picks at save time
ALTER TABLE public.saved_permit_roadmaps
  DROP CONSTRAINT IF EXISTS saved_permit_roadmaps_user_key_unique;

ALTER TABLE public.saved_permit_roadmaps
  ADD COLUMN IF NOT EXISTS refreshed_at timestamptz;

-- 2. Item archiving + per-field timestamps for merge
ALTER TABLE public.permit_items
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_reason text,
  ADD COLUMN IF NOT EXISTS field_updated_at jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 3. Per-field merge RPC (last-write-wins per field, by client timestamp)
CREATE OR REPLACE FUNCTION public.merge_permit_item(
  p_roadmap_id uuid,
  p_item_key text,
  p_patch jsonb,
  p_field_ts jsonb
)
RETURNS public.permit_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_existing public.permit_items;
  v_new_ts jsonb := COALESCE(p_field_ts, '{}'::jsonb);
  v_merged_ts jsonb;
  v_field text;
  v_incoming_ts timestamptz;
  v_existing_ts timestamptz;
  v_accept boolean;
  v_status text;
  v_permit_number text;
  v_issuing_agency text;
  v_notes text;
  v_issue_date date;
  v_expires_on date;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT user_id INTO v_owner FROM public.saved_permit_roadmaps WHERE id = p_roadmap_id;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Roadmap not found';
  END IF;
  IF v_owner <> v_uid THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO v_existing
  FROM public.permit_items
  WHERE roadmap_id = p_roadmap_id AND item_key = p_item_key;

  -- Defaults from existing (or initial values for insert)
  v_status         := COALESCE(v_existing.status, 'not_started');
  v_permit_number  := v_existing.permit_number;
  v_issuing_agency := v_existing.issuing_agency;
  v_notes          := v_existing.notes;
  v_issue_date     := v_existing.issue_date;
  v_expires_on     := v_existing.expires_on;
  v_merged_ts      := COALESCE(v_existing.field_updated_at, '{}'::jsonb);

  FOR v_field IN SELECT jsonb_object_keys(p_patch) LOOP
    v_incoming_ts := (v_new_ts ->> v_field)::timestamptz;
    IF v_incoming_ts IS NULL THEN v_incoming_ts := now(); END IF;
    v_existing_ts := (v_merged_ts ->> v_field)::timestamptz;
    v_accept := v_existing_ts IS NULL OR v_incoming_ts >= v_existing_ts;
    IF NOT v_accept THEN
      CONTINUE;
    END IF;

    IF v_field = 'status' THEN
      v_status := COALESCE(p_patch->>'status', v_status);
    ELSIF v_field = 'permit_number' THEN
      v_permit_number := NULLIF(p_patch->>'permit_number', '');
    ELSIF v_field = 'issuing_agency' THEN
      v_issuing_agency := NULLIF(p_patch->>'issuing_agency', '');
    ELSIF v_field = 'notes' THEN
      v_notes := NULLIF(p_patch->>'notes', '');
    ELSIF v_field = 'issue_date' THEN
      v_issue_date := NULLIF(p_patch->>'issue_date', '')::date;
    ELSIF v_field = 'expires_on' THEN
      v_expires_on := NULLIF(p_patch->>'expires_on', '')::date;
    ELSE
      CONTINUE;
    END IF;

    v_merged_ts := jsonb_set(v_merged_ts, ARRAY[v_field], to_jsonb(v_incoming_ts::text), true);
  END LOOP;

  IF v_existing.id IS NULL THEN
    INSERT INTO public.permit_items (
      user_id, roadmap_id, item_key, status,
      permit_number, issuing_agency, notes,
      issue_date, expires_on, field_updated_at
    ) VALUES (
      v_uid, p_roadmap_id, p_item_key, v_status,
      v_permit_number, v_issuing_agency, v_notes,
      v_issue_date, v_expires_on, v_merged_ts
    )
    RETURNING * INTO v_existing;
  ELSE
    UPDATE public.permit_items
    SET status = v_status,
        permit_number = v_permit_number,
        issuing_agency = v_issuing_agency,
        notes = v_notes,
        issue_date = v_issue_date,
        expires_on = v_expires_on,
        field_updated_at = v_merged_ts,
        updated_at = now()
    WHERE id = v_existing.id
    RETURNING * INTO v_existing;
  END IF;

  RETURN v_existing;
END;
$$;

GRANT EXECUTE ON FUNCTION public.merge_permit_item(uuid, text, jsonb, jsonb) TO authenticated;

-- 4. Refresh roadmap: swap requirements, archive removed items, preserve progress/uploads
CREATE OR REPLACE FUNCTION public.refresh_permit_roadmap(
  p_roadmap_id uuid,
  p_new_payload jsonb,
  p_new_item_keys text[]
)
RETURNS public.saved_permit_roadmaps
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.saved_permit_roadmaps;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row FROM public.saved_permit_roadmaps WHERE id = p_roadmap_id;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Roadmap not found';
  END IF;
  IF v_row.user_id <> v_uid THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- Archive items whose item_key is no longer in the new payload
  UPDATE public.permit_items
  SET archived = true,
      archived_at = now(),
      archived_reason = COALESCE(archived_reason, 'no_longer_required')
  WHERE roadmap_id = p_roadmap_id
    AND archived = false
    AND NOT (item_key = ANY (COALESCE(p_new_item_keys, ARRAY[]::text[])));

  -- Un-archive any items that came back into the new payload
  UPDATE public.permit_items
  SET archived = false,
      archived_at = NULL,
      archived_reason = NULL
  WHERE roadmap_id = p_roadmap_id
    AND archived = true
    AND item_key = ANY (COALESCE(p_new_item_keys, ARRAY[]::text[]));

  UPDATE public.saved_permit_roadmaps
  SET result_payload = p_new_payload,
      refreshed_at = now(),
      updated_at = now()
  WHERE id = p_roadmap_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_permit_roadmap(uuid, jsonb, text[]) TO authenticated;

-- 5. Lock down user_roles self-insert (privilege escalation finding)
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can insert their roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users insert own role" ON public.user_roles;

-- Only service_role can insert into user_roles. Admin promotion must go through
-- a server-side function or edge function running as service_role.
CREATE POLICY "Only service role can insert roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (false);
