-- Update the conversation message notification function to check preferences
CREATE OR REPLACE FUNCTION public.notify_new_conversation_message()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id UUID;
  sender_name TEXT;
  conversation_record RECORD;
  prefs RECORD;
  should_notify BOOLEAN;
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
  should_notify := COALESCE(prefs.message_inapp, true);

  IF NOT should_notify THEN
    RETURN NEW;
  END IF;

  -- Get sender name
  SELECT full_name INTO sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  -- Insert notification for the recipient
  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (
    recipient_id,
    'message',
    'New message from ' || COALESCE(sender_name, 'someone'),
    LEFT(NEW.message, 100) || CASE WHEN LENGTH(NEW.message) > 100 THEN '...' ELSE '' END,
    '/messages/' || NEW.conversation_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update the booking message notification function to check preferences
CREATE OR REPLACE FUNCTION public.notify_new_booking_message()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id UUID;
  sender_name TEXT;
  booking_record RECORD;
  prefs RECORD;
  should_notify BOOLEAN;
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
  should_notify := COALESCE(prefs.message_inapp, true);

  IF NOT should_notify THEN
    RETURN NEW;
  END IF;

  -- Get sender name
  SELECT full_name INTO sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  -- Insert notification for the recipient
  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (
    recipient_id,
    'message',
    'New message from ' || COALESCE(sender_name, 'someone'),
    LEFT(NEW.message, 100) || CASE WHEN LENGTH(NEW.message) > 100 THEN '...' ELSE '' END,
    '/dashboard'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;