-- Update the booking message notification function to link to the booking directly
CREATE OR REPLACE FUNCTION public.notify_new_booking_message()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id UUID;
  sender_name TEXT;
  booking_record RECORD;
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

  -- Get sender name
  SELECT full_name INTO sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  -- Insert notification for the recipient - link to dashboard with booking context
  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (
    recipient_id,
    'message',
    'New message from ' || COALESCE(sender_name, 'someone'),
    LEFT(NEW.message, 100) || CASE WHEN LENGTH(NEW.message) > 100 THEN '...' ELSE '' END,
    '/dashboard?booking=' || NEW.booking_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;