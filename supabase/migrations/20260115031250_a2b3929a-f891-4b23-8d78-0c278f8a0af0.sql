-- Fix the notify_new_review trigger to use correct column names (review_inapp doesn't exist, use sale_inapp as fallback for reviews)
CREATE OR REPLACE FUNCTION public.notify_new_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  reviewer_name TEXT;
  listing_title TEXT;
  prefs notification_preferences%ROWTYPE;
  should_notify_inapp BOOLEAN;
  should_notify_push BOOLEAN;
  notification_title TEXT;
  notification_message TEXT;
  notification_link TEXT;
  star_display TEXT;
BEGIN
  -- Get listing info
  SELECT l.title INTO listing_title
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
  WHERE user_id = NEW.host_id;

  -- Use booking_request_inapp as fallback since review_inapp doesn't exist
  should_notify_inapp := COALESCE(prefs.booking_request_inapp, true);

  -- Create in-app notification if enabled
  IF should_notify_inapp THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (NEW.host_id, 'review', notification_title, notification_message, notification_link);
  END IF;

  RETURN NEW;
END;
$function$;