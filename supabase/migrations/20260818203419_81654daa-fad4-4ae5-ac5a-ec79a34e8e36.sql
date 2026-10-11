
CREATE OR REPLACE FUNCTION public.guard_message_recipient_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := COALESCE(current_setting('request.jwt.claims', true)::jsonb ->> 'role', current_user);
BEGIN
  IF v_role IN ('service_role','postgres','supabase_admin') OR public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Anyone who is not the sender may only flip read_at.
  IF auth.uid() IS DISTINCT FROM OLD.sender_id THEN
    NEW := OLD;
    NEW.read_at := COALESCE((to_jsonb(NEW) ->> 'read_at')::timestamptz, OLD.read_at);
    NEW.read_at := COALESCE(NEW.read_at, OLD.read_at);
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_message_recipient_update() FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_booking_message_update ON public.booking_messages;
CREATE TRIGGER trg_guard_booking_message_update
BEFORE UPDATE ON public.booking_messages
FOR EACH ROW EXECUTE FUNCTION public.guard_message_recipient_update();

DROP TRIGGER IF EXISTS trg_guard_conversation_message_update ON public.conversation_messages;
CREATE TRIGGER trg_guard_conversation_message_update
BEFORE UPDATE ON public.conversation_messages
FOR EACH ROW EXECUTE FUNCTION public.guard_message_recipient_update();
