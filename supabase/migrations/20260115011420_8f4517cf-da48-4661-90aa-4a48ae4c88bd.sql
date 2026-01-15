
-- Create a function to notify hosts when they receive a new booking request
CREATE OR REPLACE FUNCTION public.notify_new_booking_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  shopper_name TEXT;
  listing_title TEXT;
  prefs RECORD;
  should_notify_inapp BOOLEAN;
  should_notify_push BOOLEAN;
  notification_title TEXT;
  notification_message TEXT;
  notification_link TEXT;
BEGIN
  -- Get shopper name
  SELECT full_name INTO shopper_name
  FROM public.profiles
  WHERE id = NEW.shopper_id;

  -- Get listing title
  SELECT title INTO listing_title
  FROM public.listings
  WHERE id = NEW.listing_id;

  notification_title := 'New Booking Request! 📅';
  notification_message := COALESCE(shopper_name, 'Someone') || ' wants to book "' || COALESCE(listing_title, 'your listing') || '"';
  notification_link := '/dashboard';

  -- Check host's notification preferences
  SELECT * INTO prefs
  FROM public.notification_preferences
  WHERE user_id = NEW.host_id;

  should_notify_inapp := COALESCE(prefs.booking_inapp, true);
  should_notify_push := COALESCE(prefs.push_enabled, false);

  -- Create in-app notification
  IF should_notify_inapp THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (NEW.host_id, 'booking', notification_title, notification_message, notification_link);
  END IF;

  -- Send push notification
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
        'tag', 'new-booking-' || NEW.id
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Create the trigger for new booking requests
DROP TRIGGER IF EXISTS on_new_booking_request ON public.booking_requests;
CREATE TRIGGER on_new_booking_request
  AFTER INSERT ON public.booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_booking_request();
