ALTER TABLE public.conversation_messages ADD COLUMN IF NOT EXISTS held_for_relay boolean NOT NULL DEFAULT false;
ALTER TABLE public.booking_messages ADD COLUMN IF NOT EXISTS held_for_relay boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.conversation_messages.held_for_relay IS 'Member-sent messages are held for Vendibook to relay; only sender and admins can read them. Relayed copies are inserted by the backend with false.';
COMMENT ON COLUMN public.booking_messages.held_for_relay IS 'Member-sent messages are held for Vendibook to relay; only sender and admins can read them.';

CREATE OR REPLACE FUNCTION public.hold_member_message_for_relay()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Any signed-in non-admin sender is held; backend (no auth.uid) and admins may post visible relayed messages.
  IF auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid()) THEN
    NEW.held_for_relay := true;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS a_hold_for_relay ON public.conversation_messages;
CREATE TRIGGER a_hold_for_relay BEFORE INSERT ON public.conversation_messages FOR EACH ROW EXECUTE FUNCTION public.hold_member_message_for_relay();
DROP TRIGGER IF EXISTS a_hold_for_relay ON public.booking_messages;
CREATE TRIGGER a_hold_for_relay BEFORE INSERT ON public.booking_messages FOR EACH ROW EXECUTE FUNCTION public.hold_member_message_for_relay();

CREATE OR REPLACE FUNCTION public.guard_relay_flag_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.held_for_relay IS DISTINCT FROM OLD.held_for_relay AND auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_relay_flag ON public.conversation_messages;
CREATE TRIGGER guard_relay_flag BEFORE UPDATE ON public.conversation_messages FOR EACH ROW EXECUTE FUNCTION public.guard_relay_flag_update();
DROP TRIGGER IF EXISTS guard_relay_flag ON public.booking_messages;
CREATE TRIGGER guard_relay_flag BEFORE UPDATE ON public.booking_messages FOR EACH ROW EXECUTE FUNCTION public.guard_relay_flag_update();

-- Recipients no longer receive direct notifications for held messages.
DROP TRIGGER IF EXISTS on_new_conversation_message ON public.conversation_messages;
CREATE TRIGGER on_new_conversation_message AFTER INSERT ON public.conversation_messages FOR EACH ROW WHEN (NOT NEW.held_for_relay) EXECUTE FUNCTION public.notify_new_conversation_message();
DROP TRIGGER IF EXISTS on_new_booking_message ON public.booking_messages;
CREATE TRIGGER on_new_booking_message AFTER INSERT ON public.booking_messages FOR EACH ROW WHEN (NOT NEW.held_for_relay) EXECUTE FUNCTION public.notify_new_booking_message();

-- Alert Vendibook support when a held message arrives.
CREATE OR REPLACE FUNCTION public.alert_support_held_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/send-message-email',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', public.internal_cron_secret()),
    body := jsonb_build_object('relay_alert', true, 'table', TG_TABLE_NAME, 'message_id', NEW.id::text)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS z_alert_support_held ON public.conversation_messages;
CREATE TRIGGER z_alert_support_held AFTER INSERT ON public.conversation_messages FOR EACH ROW WHEN (NEW.held_for_relay) EXECUTE FUNCTION public.alert_support_held_message();
DROP TRIGGER IF EXISTS z_alert_support_held ON public.booking_messages;
CREATE TRIGGER z_alert_support_held AFTER INSERT ON public.booking_messages FOR EACH ROW WHEN (NEW.held_for_relay) EXECUTE FUNCTION public.alert_support_held_message();

-- Visibility: held messages visible only to their sender (admins keep their own policies).
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.conversation_messages;
CREATE POLICY "Users can view messages in their conversations" ON public.conversation_messages FOR SELECT
USING ((sender_id = auth.uid() OR NOT held_for_relay) AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_messages.conversation_id AND (c.host_id = auth.uid() OR c.shopper_id = auth.uid())));
DROP POLICY IF EXISTS "Users can update messages they received" ON public.conversation_messages;
CREATE POLICY "Users can update messages they received" ON public.conversation_messages FOR UPDATE
USING (NOT held_for_relay AND sender_id <> auth.uid() AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_messages.conversation_id AND (c.host_id = auth.uid() OR c.shopper_id = auth.uid())));

DROP POLICY IF EXISTS "Hosts can view booking messages" ON public.booking_messages;
CREATE POLICY "Hosts can view booking messages" ON public.booking_messages FOR SELECT
USING ((sender_id = auth.uid() OR NOT held_for_relay) AND EXISTS (SELECT 1 FROM public.booking_requests br WHERE br.id = booking_messages.booking_id AND br.host_id = auth.uid()));
DROP POLICY IF EXISTS "Shoppers can view booking messages" ON public.booking_messages;
CREATE POLICY "Shoppers can view booking messages" ON public.booking_messages FOR SELECT
USING ((sender_id = auth.uid() OR NOT held_for_relay) AND EXISTS (SELECT 1 FROM public.booking_requests br WHERE br.id = booking_messages.booking_id AND br.shopper_id = auth.uid()));
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.booking_messages;
CREATE POLICY "Users can mark messages as read" ON public.booking_messages FOR UPDATE
USING (NOT held_for_relay AND sender_id <> auth.uid() AND EXISTS (SELECT 1 FROM public.booking_requests br WHERE br.id = booking_messages.booking_id AND (br.host_id = auth.uid() OR br.shopper_id = auth.uid())));