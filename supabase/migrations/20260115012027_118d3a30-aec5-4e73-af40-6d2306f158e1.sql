
-- Create a function to notify on sale transaction status changes
CREATE OR REPLACE FUNCTION public.notify_sale_transaction_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  seller_name TEXT;
  buyer_name TEXT;
  listing_title TEXT;
  prefs RECORD;
  should_notify_inapp BOOLEAN;
  should_notify_push BOOLEAN;
  notification_title TEXT;
  notification_message TEXT;
  notification_link TEXT;
  recipient_id UUID;
BEGIN
  -- Only trigger on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get names and listing info
  SELECT full_name INTO seller_name FROM public.profiles WHERE id = NEW.seller_id;
  SELECT full_name INTO buyer_name FROM public.profiles WHERE id = NEW.buyer_id;
  SELECT title INTO listing_title FROM public.listings WHERE id = NEW.listing_id;

  notification_link := '/dashboard';

  -- Handle different status changes
  IF NEW.status = 'paid' THEN
    -- Notify seller that payment was received
    recipient_id := NEW.seller_id;
    notification_title := 'Payment Received! 💰';
    notification_message := COALESCE(buyer_name, 'A buyer') || ' has paid for "' || COALESCE(listing_title, 'your item') || '"';
    
  ELSIF NEW.status = 'confirmed' THEN
    -- Notify buyer that the sale was confirmed
    recipient_id := NEW.buyer_id;
    notification_title := 'Sale Confirmed! ✅';
    notification_message := 'Your purchase of "' || COALESCE(listing_title, 'an item') || '" from ' || COALESCE(seller_name, 'the seller') || ' has been confirmed';
    
  ELSIF NEW.status = 'disputed' THEN
    -- Notify seller that the sale is disputed
    recipient_id := NEW.seller_id;
    notification_title := 'Sale Disputed ⚠️';
    notification_message := COALESCE(buyer_name, 'The buyer') || ' has raised a dispute for "' || COALESCE(listing_title, 'your item') || '"';
    
  ELSIF NEW.status = 'refunded' THEN
    -- Notify buyer that refund was processed
    recipient_id := NEW.buyer_id;
    notification_title := 'Refund Processed 💳';
    notification_message := 'Your refund for "' || COALESCE(listing_title, 'your purchase') || '" has been processed';
    
  ELSIF NEW.status = 'completed' THEN
    -- Notify both parties
    -- First notify seller
    SELECT * INTO prefs FROM public.notification_preferences WHERE user_id = NEW.seller_id;
    should_notify_inapp := COALESCE(prefs.sale_inapp, true);
    should_notify_push := COALESCE(prefs.push_enabled, false);
    
    IF should_notify_inapp THEN
      INSERT INTO public.notifications (user_id, type, title, message, link)
      VALUES (NEW.seller_id, 'sale', 'Sale Completed! 🎉', 'Your sale of "' || COALESCE(listing_title, 'your item') || '" is complete. Funds will be transferred soon.', notification_link);
    END IF;
    
    IF should_notify_push THEN
      PERFORM net.http_post(
        url := 'https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5icmVoYndmc21lZGJlbHpudHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDgzMTMsImV4cCI6MjA4MzY4NDMxM30.EkA-lGUmkLQ9rPAO-unLxGGGHVmPDdVR8awlA2ShVpU'
        ),
        body := jsonb_build_object(
          'user_id', NEW.seller_id::text,
          'title', 'Sale Completed! 🎉',
          'body', 'Your sale of "' || COALESCE(listing_title, 'your item') || '" is complete.',
          'url', notification_link,
          'tag', 'sale-' || NEW.id
        )
      );
    END IF;
    
    -- Then notify buyer
    recipient_id := NEW.buyer_id;
    notification_title := 'Purchase Complete! 🎉';
    notification_message := 'Your purchase of "' || COALESCE(listing_title, 'an item') || '" is complete. Thank you for shopping!';
  ELSE
    RETURN NEW;
  END IF;

  -- Check recipient's notification preferences
  SELECT * INTO prefs FROM public.notification_preferences WHERE user_id = recipient_id;
  should_notify_inapp := COALESCE(prefs.sale_inapp, true);
  should_notify_push := COALESCE(prefs.push_enabled, false);

  -- Create in-app notification
  IF should_notify_inapp THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (recipient_id, 'sale', notification_title, notification_message, notification_link);
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
        'user_id', recipient_id::text,
        'title', notification_title,
        'body', notification_message,
        'url', notification_link,
        'tag', 'sale-' || NEW.id
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Create the trigger for sale transaction status changes
DROP TRIGGER IF EXISTS on_sale_transaction_status_change ON public.sale_transactions;
CREATE TRIGGER on_sale_transaction_status_change
  AFTER UPDATE ON public.sale_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_sale_transaction_status_change();
