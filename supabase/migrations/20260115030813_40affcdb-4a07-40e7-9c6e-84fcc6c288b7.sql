-- Fix the notify_new_booking_request trigger to use correct column names
CREATE OR REPLACE FUNCTION notify_new_booking_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefs notification_preferences%ROWTYPE;
  should_notify_inapp boolean;
BEGIN
  -- Get notification preferences for the host
  SELECT * INTO prefs FROM notification_preferences WHERE user_id = NEW.host_id;
  
  -- Use booking_request_inapp (the correct column name)
  should_notify_inapp := COALESCE(prefs.booking_request_inapp, true);
  
  -- Create in-app notification if enabled
  IF should_notify_inapp THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      NEW.host_id,
      'booking_request',
      'New Booking Request',
      'You have received a new booking request',
      '/dashboard'
    );
  END IF;
  
  RETURN NEW;
END;
$$;