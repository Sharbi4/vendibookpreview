DROP TRIGGER IF EXISTS on_auth_user_created_admin_notification ON auth.users;
DROP FUNCTION IF EXISTS public.notify_admin_new_user_signup();

CREATE OR REPLACE FUNCTION public.notify_admin_profile_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
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
        'full_name', NEW.full_name,
        'first_name', NEW.first_name,
        'last_name', NEW.last_name,
        'phone_number', NEW.phone_number,
        'user_id', NEW.id::text
      )
    )
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_profile_created_admin_notification ON public.profiles;
CREATE TRIGGER on_profile_created_admin_notification
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_profile_created();