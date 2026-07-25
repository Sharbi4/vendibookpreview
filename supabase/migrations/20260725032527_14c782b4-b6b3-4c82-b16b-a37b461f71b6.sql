
CREATE OR REPLACE FUNCTION public.apply_pending_featured_on_publish()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_now timestamptz := now();
  v_start timestamptz;
  v_expires timestamptz;
  v_host_email text;
  v_host_first_name text;
  v_expires_str text;
  v_push_enabled boolean;
BEGIN
  IF NEW.status = 'published'
     AND NEW.pending_featured_payment IS NOT NULL
     AND (NEW.pending_featured_payment ? 'applied_at') = false
  THEN
    -- STACKING: if a boost is already live, extend from its current expiry.
    v_start := GREATEST(COALESCE(NEW.featured_expires_at, v_now), v_now);
    v_expires := v_start + INTERVAL '30 days';

    NEW.featured_enabled := true;
    NEW.featured_at := COALESCE(NEW.featured_at, v_now);
    NEW.featured_expires_at := v_expires;
    NEW.published_at := COALESCE(NEW.published_at, v_now);
    NEW.pending_featured_payment := NEW.pending_featured_payment
      || jsonb_build_object('applied_at', v_now, 'applied_expires_at', v_expires);

    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      NEW.host_id,
      'listing',
      'Featured Boost Activated! ⭐',
      'Your prepaid Featured Boost has been applied to "' || COALESCE(NEW.title, 'your listing') || '" — active until ' || to_char(v_expires AT TIME ZONE 'America/Phoenix', 'FMMonth FMDD, YYYY') || '.',
      '/listing/' || NEW.id
    );

    SELECT email, COALESCE(first_name, split_part(full_name, ' ', 1))
      INTO v_host_email, v_host_first_name
    FROM public.profiles
    WHERE id = NEW.host_id;

    v_expires_str := to_char(v_expires AT TIME ZONE 'America/Phoenix', 'FMMonth FMDD, YYYY');

    IF v_host_email IS NOT NULL THEN
      PERFORM net.http_post(
        url := 'https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/send-transactional-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5icmVoYndmc21lZGJlbHpudHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDgzMTMsImV4cCI6MjA4MzY4NDMxM30.EkA-lGUmkLQ9rPAO-unLxGGGHVmPDdVR8awlA2ShVpU'
        ),
        body := jsonb_build_object(
          'templateName', 'featured-payment-receipt',
          'recipientEmail', v_host_email,
          'idempotencyKey', 'featured-activated-' || NEW.id::text || '-' || extract(epoch from v_expires)::bigint,
          'templateData', jsonb_build_object(
            'firstName', v_host_first_name,
            'listingTitle', NEW.title,
            'listingId', NEW.id::text,
            'amount', COALESCE(NEW.pending_featured_payment->>'amount', '$30.00'),
            'expiresAt', v_expires_str,
            'receiptId', COALESCE(NEW.pending_featured_payment->>'payment_intent_id', NEW.pending_featured_payment->>'source')
          )
        )
      );
    END IF;

    SELECT COALESCE(push_enabled, false) INTO v_push_enabled
    FROM public.notification_preferences
    WHERE user_id = NEW.host_id;

    IF COALESCE(v_push_enabled, false) THEN
      PERFORM net.http_post(
        url := 'https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5icmVoYndmc21lZGJlbHpudHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDgzMTMsImV4cCI6MjA4MzY4NDMxM30.EkA-lGUmkLQ9rPAO-unLxGGGHVmPDdVR8awlA2ShVpU'
        ),
        body := jsonb_build_object(
          'user_id', NEW.host_id::text,
          'title', 'Featured Boost Activated ⭐',
          'body', '"' || COALESCE(NEW.title, 'Your listing') || '" is now featured until ' || v_expires_str || '.',
          'url', '/listing/' || NEW.id::text,
          'tag', 'featured-activated-' || NEW.id::text
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
