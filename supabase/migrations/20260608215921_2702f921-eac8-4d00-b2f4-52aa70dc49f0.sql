CREATE OR REPLACE FUNCTION public.notify_admin_new_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_full_name text;
BEGIN
  v_full_name := COALESCE(
    NULLIF(TRIM(CONCAT(COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''), ' ', COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''))), ''),
    NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
    ''
  );

  PERFORM net.http_post(
    url := 'https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/send-admin-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6Im5icmVoYndmc21lZGJlbHpudHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDgzMTMsImV4cCI6MjA4MzY4NDMxM30.EkA-lGUmkLQ9rPAO-unLxGGGHVmPDdVR8awlA2ShVpU',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6Im5icmVoYndmc21lZGJlbHpudHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDgzMTMsImV4cCI6MjA4MzY4NDMxM30.EkA-lGUmkLQ9rPAO-unLxGGGHVmPDdVR8awlA2ShVpU'
    ),
    body := jsonb_build_object(
      'type', 'new_user',
      'data', jsonb_build_object(
        'email', NEW.email,
        'full_name', v_full_name,
        'first_name', NEW.raw_user_meta_data ->> 'first_name',
        'last_name', NEW.raw_user_meta_data ->> 'last_name',
        'phone_number', NEW.raw_user_meta_data ->> 'phone_number',
        'provider', COALESCE(NEW.raw_app_meta_data ->> 'provider', 'email'),
        'user_id', NEW.id::text
      )
    )
  );

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_admin_listing_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_host_email text;
  v_host_name text;
  v_price text;
BEGIN
  IF NEW.status <> 'published' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN
    RETURN NEW;
  END IF;

  SELECT email, COALESCE(NULLIF(full_name, ''), NULLIF(display_name, ''), NULLIF(business_name, ''))
    INTO v_host_email, v_host_name
  FROM public.profiles
  WHERE id = NEW.host_id;

  v_price := CASE
    WHEN NEW.mode = 'sale' THEN COALESCE('$' || NEW.price_sale::text, '')
    WHEN NEW.price_daily IS NOT NULL THEN '$' || NEW.price_daily::text || '/day'
    WHEN NEW.price_hourly IS NOT NULL THEN '$' || NEW.price_hourly::text || '/hour'
    WHEN NEW.price_weekly IS NOT NULL THEN '$' || NEW.price_weekly::text || '/week'
    WHEN NEW.price_monthly IS NOT NULL THEN '$' || NEW.price_monthly::text || '/month'
    ELSE ''
  END;

  PERFORM net.http_post(
    url := 'https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/send-admin-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6Im5icmVoYndmc21lZGJlbHpudHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDgzMTMsImV4cCI6MjA4MzY4NDMxM30.EkA-lGUmkLQ9rPAO-unLxGGGHVmPDdVR8awlA2ShVpU',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6Im5icmVoYndmc21lZGJlbHpudHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDgzMTMsImV4cCI6MjA4MzY4NDMxM30.EkA-lGUmkLQ9rPAO-unLxGGGHVmPDdVR8awlA2ShVpU'
    ),
    body := jsonb_build_object(
      'type', 'new_listing',
      'data', jsonb_build_object(
        'listing_id', NEW.id::text,
        'listing_title', NEW.title,
        'category', NEW.category::text,
        'mode', NEW.mode::text,
        'price', v_price,
        'city', NEW.city,
        'state', NEW.state,
        'host_email', v_host_email,
        'host_name', v_host_name,
        'user_id', NEW.host_id::text,
        'published_at', COALESCE(NEW.published_at, now())::text
      )
    )
  );

  RETURN NEW;
END;
$function$;