
-- Create a function to notify shoppers when their document status changes
CREATE OR REPLACE FUNCTION public.notify_document_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  shopper_id UUID;
  listing_title TEXT;
  prefs RECORD;
  should_notify_inapp BOOLEAN;
  should_notify_push BOOLEAN;
  notification_title TEXT;
  notification_message TEXT;
  notification_link TEXT;
BEGIN
  -- Only trigger on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Only notify for approved or rejected status
  IF NEW.status NOT IN ('approved', 'rejected') THEN
    RETURN NEW;
  END IF;

  -- Get booking info to find the shopper and listing
  SELECT br.shopper_id, l.title INTO shopper_id, listing_title
  FROM public.booking_requests br
  JOIN public.listings l ON l.id = br.listing_id
  WHERE br.id = NEW.booking_id;

  notification_link := '/dashboard';

  IF NEW.status = 'approved' THEN
    notification_title := 'Document Approved ✅';
    notification_message := 'Your document "' || COALESCE(NEW.document_type, 'document') || '" for "' || COALESCE(listing_title, 'your booking') || '" has been approved';
  ELSE
    notification_title := 'Document Rejected ❌';
    notification_message := 'Your document "' || COALESCE(NEW.document_type, 'document') || '" for "' || COALESCE(listing_title, 'your booking') || '" was rejected. Please upload a new one.';
  END IF;

  -- Check shopper's notification preferences
  SELECT * INTO prefs
  FROM public.notification_preferences
  WHERE user_id = shopper_id;

  should_notify_inapp := COALESCE(prefs.document_inapp, true);
  should_notify_push := COALESCE(prefs.push_enabled, false);

  -- Create in-app notification
  IF should_notify_inapp THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (shopper_id, 'document', notification_title, notification_message, notification_link);
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
        'user_id', shopper_id::text,
        'title', notification_title,
        'body', notification_message,
        'url', notification_link,
        'tag', 'document-' || NEW.id
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Create the trigger for document status changes
DROP TRIGGER IF EXISTS on_document_status_change ON public.booking_documents;
CREATE TRIGGER on_document_status_change
  AFTER UPDATE ON public.booking_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_document_status_change();
