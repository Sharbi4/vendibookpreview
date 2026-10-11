
CREATE OR REPLACE FUNCTION public.guard_message_recipient_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := COALESCE(current_setting('request.jwt.claims', true)::jsonb ->> 'role', current_user);
  v_new_read_at timestamptz;
BEGIN
  IF v_role IN ('service_role','postgres','supabase_admin') OR public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS DISTINCT FROM OLD.sender_id THEN
    v_new_read_at := (to_jsonb(NEW) ->> 'read_at')::timestamptz;
    NEW := OLD;
    NEW := jsonb_populate_record(NEW, jsonb_build_object('read_at', COALESCE(v_new_read_at, (to_jsonb(OLD) ->> 'read_at')::timestamptz)));
  END IF;

  RETURN NEW;
END;
$$;
