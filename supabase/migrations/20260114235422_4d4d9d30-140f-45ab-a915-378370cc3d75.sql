-- Simplified approach: Use net extension with hardcoded project URL
-- The triggers will create in-app notifications directly and queue email via net.http_post

CREATE OR REPLACE FUNCTION public.notify_new_conversation_message()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id UUID;
  sender_name TEXT;
  recipient_email TEXT;
  conversation_record RECORD;
  prefs RECORD;
  should_notify_inapp BOOLEAN;
  should_notify_email BOOLEAN;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Get the conversation details
  SELECT * INTO conversation_record
  FROM public.conversations
  WHERE id = NEW.conversation_id;

  -- Determine the recipient (the other party in the conversation)
  IF NEW.sender_id = conversation_record.host_id THEN
    recipient_id := conversation_record.shopper_id;
  ELSE
    recipient_id := conversation_record.host_id;
  END IF;

  -- Check notification preferences
  SELECT * INTO prefs
  FROM public.notification_preferences
  WHERE user_id = recipient_id;

  -- Default to true if no preferences exist
  should_notify_inapp := COALESCE(prefs.message_inapp, true);
  should_notify_email := COALESCE(prefs.message_email, true);

  -- If neither notification type is enabled, skip
  IF NOT should_notify_inapp AND NOT should_notify_email THEN
    RETURN NEW;
  END IF;

  -- Get sender name and recipient email
  SELECT full_name INTO sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  SELECT email INTO recipient_email
  FROM public.profiles
  WHERE id = recipient_id;

  notification_title := 'New message from ' || COALESCE(sender_name, 'someone');
  notification_message := LEFT(NEW.message, 100) || CASE WHEN LENGTH(NEW.message) > 100 THEN '...' ELSE '' END;

  -- Create in-app notification if enabled
  IF should_notify_inapp THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      recipient_id,
      'message',
      notification_title,
      notification_message,
      '/messages/' || NEW.conversation_id
    );
  END IF;

  -- Queue email notification via edge function if enabled
  IF should_notify_email AND recipient_email IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/send-message-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5icmVoYndmc21lZGJlbHpudHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDgzMTMsImV4cCI6MjA4MzY4NDMxM30.EkA-lGUmkLQ9rPAO-unLxGGGHVmPDdVR8awlA2ShVpU'
      ),
      body := jsonb_build_object(
        'recipient_email', recipient_email,
        'sender_name', COALESCE(sender_name, 'Someone'),
        'message_preview', notification_message,
        'link', '/messages/' || NEW.conversation_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update the booking message notification function
CREATE OR REPLACE FUNCTION public.notify_new_booking_message()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id UUID;
  sender_name TEXT;
  recipient_email TEXT;
  booking_record RECORD;
  prefs RECORD;
  should_notify_inapp BOOLEAN;
  should_notify_email BOOLEAN;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Get the booking details
  SELECT * INTO booking_record
  FROM public.booking_requests
  WHERE id = NEW.booking_id;

  -- Determine the recipient (the other party in the booking)
  IF NEW.sender_id = booking_record.host_id THEN
    recipient_id := booking_record.shopper_id;
  ELSE
    recipient_id := booking_record.host_id;
  END IF;

  -- Check notification preferences
  SELECT * INTO prefs
  FROM public.notification_preferences
  WHERE user_id = recipient_id;

  -- Default to true if no preferences exist
  should_notify_inapp := COALESCE(prefs.message_inapp, true);
  should_notify_email := COALESCE(prefs.message_email, true);

  -- If neither notification type is enabled, skip
  IF NOT should_notify_inapp AND NOT should_notify_email THEN
    RETURN NEW;
  END IF;

  -- Get sender name and recipient email
  SELECT full_name INTO sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  SELECT email INTO recipient_email
  FROM public.profiles
  WHERE id = recipient_id;

  notification_title := 'New message from ' || COALESCE(sender_name, 'someone');
  notification_message := LEFT(NEW.message, 100) || CASE WHEN LENGTH(NEW.message) > 100 THEN '...' ELSE '' END;

  -- Create in-app notification if enabled
  IF should_notify_inapp THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      recipient_id,
      'message',
      notification_title,
      notification_message,
      '/dashboard'
    );
  END IF;

  -- Queue email notification via edge function if enabled
  IF should_notify_email AND recipient_email IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/send-message-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5icmVoYndmc21lZGJlbHpudHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDgzMTMsImV4cCI6MjA4MzY4NDMxM30.EkA-lGUmkLQ9rPAO-unLxGGGHVmPDdVR8awlA2ShVpU'
      ),
      body := jsonb_build_object(
        'recipient_email', recipient_email,
        'sender_name', COALESCE(sender_name, 'Someone'),
        'message_preview', notification_message,
        'link', '/dashboard'
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;