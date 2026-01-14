-- Enable pg_net extension for HTTP requests from database
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Update the conversation message notification function to call edge function
CREATE OR REPLACE FUNCTION public.notify_new_conversation_message()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id UUID;
  sender_name TEXT;
  conversation_record RECORD;
  prefs RECORD;
  should_notify_inapp BOOLEAN;
  should_notify_email BOOLEAN;
  supabase_url TEXT;
  service_role_key TEXT;
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

  -- Get sender name
  SELECT full_name INTO sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  notification_title := 'New message from ' || COALESCE(sender_name, 'someone');
  notification_message := LEFT(NEW.message, 100) || CASE WHEN LENGTH(NEW.message) > 100 THEN '...' ELSE '' END;

  -- Get Supabase URL and service role key from vault or use direct values
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);

  -- If we have the URL and key, call the edge function
  IF supabase_url IS NOT NULL AND service_role_key IS NOT NULL THEN
    PERFORM extensions.http_post(
      supabase_url || '/functions/v1/create-notification',
      jsonb_build_object(
        'user_id', recipient_id,
        'type', 'message',
        'title', notification_title,
        'message', notification_message,
        'link', '/messages/' || NEW.conversation_id,
        'send_email', should_notify_email
      )::text,
      'application/json',
      ARRAY[
        extensions.http_header('Authorization', 'Bearer ' || service_role_key),
        extensions.http_header('Content-Type', 'application/json')
      ]
    );
  ELSE
    -- Fallback: create in-app notification directly if edge function call not possible
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
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update the booking message notification function to call edge function
CREATE OR REPLACE FUNCTION public.notify_new_booking_message()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id UUID;
  sender_name TEXT;
  booking_record RECORD;
  prefs RECORD;
  should_notify_inapp BOOLEAN;
  should_notify_email BOOLEAN;
  supabase_url TEXT;
  service_role_key TEXT;
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

  -- Get sender name
  SELECT full_name INTO sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  notification_title := 'New message from ' || COALESCE(sender_name, 'someone');
  notification_message := LEFT(NEW.message, 100) || CASE WHEN LENGTH(NEW.message) > 100 THEN '...' ELSE '' END;

  -- Get Supabase URL and service role key
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);

  -- If we have the URL and key, call the edge function
  IF supabase_url IS NOT NULL AND service_role_key IS NOT NULL THEN
    PERFORM extensions.http_post(
      supabase_url || '/functions/v1/create-notification',
      jsonb_build_object(
        'user_id', recipient_id,
        'type', 'message',
        'title', notification_title,
        'message', notification_message,
        'link', '/dashboard',
        'send_email', should_notify_email
      )::text,
      'application/json',
      ARRAY[
        extensions.http_header('Authorization', 'Bearer ' || service_role_key),
        extensions.http_header('Content-Type', 'application/json')
      ]
    );
  ELSE
    -- Fallback: create in-app notification directly if edge function call not possible
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
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;