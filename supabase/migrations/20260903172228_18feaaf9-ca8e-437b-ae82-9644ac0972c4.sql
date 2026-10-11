CREATE OR REPLACE FUNCTION public.protect_asset_request_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role text := COALESCE(current_setting('request.jwt.claims', true)::jsonb ->> 'role', current_user);
BEGIN
  IF v_role IN ('service_role','postgres','supabase_admin') OR public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  NEW.user_id := OLD.user_id;
  NEW.status := OLD.status;
  NEW.assigned_to := OLD.assigned_to;
  NEW.admin_notes := OLD.admin_notes;
  NEW.matched_listing_id := OLD.matched_listing_id;
  NEW.is_public := OLD.is_public;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_protect_asset_request_columns ON public.asset_requests;
CREATE TRIGGER trg_protect_asset_request_columns
BEFORE UPDATE ON public.asset_requests
FOR EACH ROW EXECUTE FUNCTION public.protect_asset_request_columns();

DROP POLICY IF EXISTS "Admins can view all conversations" ON public.conversations;
CREATE POLICY "Admins can view all conversations"
ON public.conversations FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all conversation messages" ON public.conversation_messages;
CREATE POLICY "Admins can view all conversation messages"
ON public.conversation_messages FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all booking messages" ON public.booking_messages;
CREATE POLICY "Admins can view all booking messages"
ON public.booking_messages FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));