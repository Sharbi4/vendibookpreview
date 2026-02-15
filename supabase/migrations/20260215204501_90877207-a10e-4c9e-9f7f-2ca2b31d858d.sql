
CREATE OR REPLACE FUNCTION public.notify_listing_deleted()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  admin_record RECORD;
  host_name TEXT;
BEGIN
  -- Get host name (may be NULL for guest drafts)
  SELECT COALESCE(display_name, full_name, 'Unknown') INTO host_name
  FROM public.profiles
  WHERE id = OLD.host_id;

  -- Default host_name if no profile found (guest draft with no host_id)
  host_name := COALESCE(host_name, 'Unknown');

  -- Notify all admins
  FOR admin_record IN 
    SELECT ur.user_id 
    FROM public.user_roles ur 
    WHERE ur.role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      admin_record.user_id,
      'listing_deleted',
      'Listing Deleted 🗑️',
      COALESCE('Listing "' || OLD.title || '" by ' || host_name || ' was deleted', 'A listing was deleted'),
      '/admin'
    );
  END LOOP;

  RETURN OLD;
END;
$function$;
