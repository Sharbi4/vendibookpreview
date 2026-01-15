
-- Create a function to notify hosts when they receive a new review
CREATE OR REPLACE FUNCTION public.notify_new_review()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  reviewer_name TEXT;
  listing_title TEXT;
  host_id UUID;
  prefs RECORD;
  should_notify_inapp BOOLEAN;
  should_notify_push BOOLEAN;
  notification_title TEXT;
  notification_message TEXT;
  notification_link TEXT;
  star_display TEXT;
BEGIN
  -- Get listing info and host_id
  SELECT l.title, l.host_id INTO listing_title, host_id
  FROM public.listings l
  WHERE l.id = NEW.listing_id;

  -- Get reviewer name
  SELECT full_name INTO reviewer_name
  FROM public.profiles
  WHERE id = NEW.reviewer_id;

  -- Create star display
  star_display := '';
  FOR i IN 1..NEW.rating LOOP
    star_display := star_display || '⭐';
  END LOOP;

  notification_title := 'New Review Received! ' || star_display;
  notification_message := COALESCE(reviewer_name, 'Someone') || ' left a ' || NEW.rating || '-star review on "' || COALESCE(listing_title, 'your listing') || '"';
  notification_link := '/listing/' || NEW.listing_id;

  -- Check host's notification preferences
  SELECT * INTO prefs
  FROM public.notification_preferences
  WHERE user_id = host_id;

  should_notify_inapp := COALESCE(prefs.review_inapp, true);
  should_notify_push := COALESCE(prefs.push_enabled, false);

  -- Create in-app notification
  IF should_notify_inapp THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (host_id, 'review', notification_title, notification_message, notification_link);
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
        'user_id', host_id::text,
        'title', notification_title,
        'body', notification_message,
        'url', notification_link,
        'tag', 'review-' || NEW.id
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Create the trigger for new reviews
DROP TRIGGER IF EXISTS on_new_review ON public.reviews;
CREATE TRIGGER on_new_review
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_review();
