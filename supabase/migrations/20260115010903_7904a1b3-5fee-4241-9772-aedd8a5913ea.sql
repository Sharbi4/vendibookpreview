
-- Create a function to notify on booking status changes
CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  shopper_name TEXT;
  host_name TEXT;
  listing_title TEXT;
  prefs RECORD;
  should_notify_inapp BOOLEAN;
  should_notify_email BOOLEAN;
  should_notify_push BOOLEAN;
  notification_title TEXT;
  notification_message TEXT;
  notification_link TEXT;
BEGIN
  -- Only trigger on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Only notify for specific status changes
  IF NEW.status NOT IN ('approved', 'declined', 'cancelled') THEN
    RETURN NEW;
  END IF;

  -- Get names and listing info
  SELECT full_name INTO shopper_name FROM public.profiles WHERE id = NEW.shopper_id;
  SELECT full_name INTO host_name FROM public.profiles WHERE id = NEW.host_id;
  SELECT title INTO listing_title FROM public.listings WHERE id = NEW.listing_id;

  notification_link := '/dashboard';

  -- Determine notification content based on status and recipient
  IF NEW.status = 'approved' THEN
    -- Notify the shopper that their booking was approved
    notification_title := 'Booking Approved! 🎉';
    notification_message := 'Your booking for "' || COALESCE(listing_title, 'a listing') || '" has been approved by ' || COALESCE(host_name, 'the host');
    
    -- Check shopper's notification preferences
    SELECT * INTO prefs FROM public.notification_preferences WHERE user_id = NEW.shopper_id;
    should_notify_inapp := COALESCE(prefs.booking_inapp, true);
    should_notify_email := COALESCE(prefs.booking_email, true);
    should_notify_push := COALESCE(prefs.push_enabled, false);

    IF should_notify_inapp THEN
      INSERT INTO public.notifications (user_id, type, title, message, link)
      VALUES (NEW.shopper_id, 'booking', notification_title, notification_message, notification_link);
    END IF;

    IF should_notify_push THEN
      PERFORM net.http_post(
        url := 'https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5icmVoYndmc21lZGJlbHpudHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDgzMTMsImV4cCI6MjA4MzY4NDMxM30.EkA-lGUmkLQ9rPAO-unLxGGGHVmPDdVR8awlA2ShVpU'
        ),
        body := jsonb_build_object(
          'user_id', NEW.shopper_id::text,
          'title', notification_title,
          'body', notification_message,
          'url', notification_link,
          'tag', 'booking-' || NEW.id
        )
      );
    END IF;

  ELSIF NEW.status = 'declined' THEN
    -- Notify the shopper that their booking was declined
    notification_title := 'Booking Declined';
    notification_message := 'Your booking request for "' || COALESCE(listing_title, 'a listing') || '" was declined';
    
    SELECT * INTO prefs FROM public.notification_preferences WHERE user_id = NEW.shopper_id;
    should_notify_inapp := COALESCE(prefs.booking_inapp, true);
    should_notify_push := COALESCE(prefs.push_enabled, false);

    IF should_notify_inapp THEN
      INSERT INTO public.notifications (user_id, type, title, message, link)
      VALUES (NEW.shopper_id, 'booking', notification_title, notification_message, notification_link);
    END IF;

    IF should_notify_push THEN
      PERFORM net.http_post(
        url := 'https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5icmVoYndmc21lZGJlbHpudHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDgzMTMsImV4cCI6MjA4MzY4NDMxM30.EkA-lGUmkLQ9rPAO-unLxGGGHVmPDdVR8awlA2ShVpU'
        ),
        body := jsonb_build_object(
          'user_id', NEW.shopper_id::text,
          'title', notification_title,
          'body', notification_message,
          'url', notification_link,
          'tag', 'booking-' || NEW.id
        )
      );
    END IF;

  ELSIF NEW.status = 'cancelled' THEN
    -- Notify the host that the booking was cancelled by the shopper
    notification_title := 'Booking Cancelled';
    notification_message := COALESCE(shopper_name, 'A shopper') || ' cancelled their booking for "' || COALESCE(listing_title, 'your listing') || '"';
    
    SELECT * INTO prefs FROM public.notification_preferences WHERE user_id = NEW.host_id;
    should_notify_inapp := COALESCE(prefs.booking_inapp, true);
    should_notify_push := COALESCE(prefs.push_enabled, false);

    IF should_notify_inapp THEN
      INSERT INTO public.notifications (user_id, type, title, message, link)
      VALUES (NEW.host_id, 'booking', notification_title, notification_message, notification_link);
    END IF;

    IF should_notify_push THEN
      PERFORM net.http_post(
        url := 'https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5icmVoYndmc21lZGJlbHpudHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDgzMTMsImV4cCI6MjA4MzY4NDMxM30.EkA-lGUmkLQ9rPAO-unLxGGGHVmPDdVR8awlA2ShVpU'
        ),
        body := jsonb_build_object(
          'user_id', NEW.host_id::text,
          'title', notification_title,
          'body', notification_message,
          'url', notification_link,
          'tag', 'booking-' || NEW.id
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Create the trigger for booking status changes
DROP TRIGGER IF EXISTS on_booking_status_change ON public.booking_requests;
CREATE TRIGGER on_booking_status_change
  AFTER UPDATE ON public.booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_booking_status_change();
