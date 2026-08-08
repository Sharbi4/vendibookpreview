CREATE OR REPLACE FUNCTION public.notify_new_booking_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  recipient_id UUID;
  sender_name TEXT;
  recipient_email TEXT;
  recipient_name TEXT;
  booking_record RECORD;
  prefs RECORD;
  should_inapp BOOLEAN;
  should_email BOOLEAN;
  notification_title TEXT;
  notification_message TEXT;
  link_path TEXT;
BEGIN
  SELECT * INTO booking_record FROM public.booking_requests WHERE id = NEW.booking_id;

  IF NEW.sender_id = booking_record.host_id THEN
    recipient_id := booking_record.shopper_id;
  ELSE
    recipient_id := booking_record.host_id;
  END IF;

  IF recipient_id IS NULL OR recipient_id = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  SELECT * INTO prefs FROM public.notification_preferences WHERE user_id = recipient_id;
  should_inapp := COALESCE(prefs.message_inapp, true);
  should_email := COALESCE(prefs.message_email, true);

  SELECT full_name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  SELECT email, full_name INTO recipient_email, recipient_name FROM public.profiles WHERE id = recipient_id;

  notification_title := 'New message from ' || COALESCE(sender_name, 'someone');
  notification_message := LEFT(NEW.message, 100) || CASE WHEN LENGTH(NEW.message) > 100 THEN '...' ELSE '' END;
  link_path := '/dashboard?booking=' || NEW.booking_id;

  IF should_inapp THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (recipient_id, 'message', notification_title, notification_message, link_path);
  END IF;

  IF should_email AND recipient_email IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/send-message-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5icmVoYndmc21lZGJlbHpudHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDgzMTMsImV4cCI6MjA4MzY4NDMxM30.EkA-lGUmkLQ9rPAO-unLxGGGHVmPDdVR8awlA2ShVpU'
      ),
      body := jsonb_build_object(
        'recipient_email', recipient_email,
        'recipient_name', recipient_name,
        'sender_name', COALESCE(sender_name, 'Someone'),
        'message_preview', notification_message,
        'message_id', NEW.id::text,
        'link', link_path
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;