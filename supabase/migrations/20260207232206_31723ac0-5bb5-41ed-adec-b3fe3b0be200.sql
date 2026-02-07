-- Create trigger function to notify admins when a listing is deleted
CREATE OR REPLACE FUNCTION public.notify_listing_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_record RECORD;
  host_name TEXT;
BEGIN
  -- Get host name
  SELECT COALESCE(display_name, full_name, 'Unknown') INTO host_name
  FROM public.profiles
  WHERE id = OLD.host_id;

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
      'Listing "' || OLD.title || '" by ' || host_name || ' was deleted',
      '/admin'
    );
  END LOOP;

  RETURN OLD;
END;
$$;

-- Create trigger that fires before delete
CREATE TRIGGER on_listing_deleted
  BEFORE DELETE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_listing_deleted();