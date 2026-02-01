-- Auto-sync new users to Zendesk via Edge Function
-- This trigger calls the sync-customer-to-zendesk function when a new profile is created

-- Create the function that will be called by the trigger
CREATE OR REPLACE FUNCTION public.trigger_zendesk_sync()
RETURNS TRIGGER AS $$
DECLARE
  response_status INT;
BEGIN
  -- Call the Edge Function to sync the user to Zendesk
  -- Using pg_net extension for async HTTP calls
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-customer-to-zendesk',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object('user_id', NEW.id)
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Zendesk sync failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on the profiles table
DROP TRIGGER IF EXISTS on_profile_created_sync_zendesk ON public.profiles;

CREATE TRIGGER on_profile_created_sync_zendesk
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_zendesk_sync();

-- Also create a trigger for profile updates (optional - for keeping Zendesk in sync)
DROP TRIGGER IF EXISTS on_profile_updated_sync_zendesk ON public.profiles;

CREATE TRIGGER on_profile_updated_sync_zendesk
  AFTER UPDATE OF full_name, email, phone, role, identity_verified, business_name ON public.profiles
  FOR EACH ROW
  WHEN (
    OLD.full_name IS DISTINCT FROM NEW.full_name OR
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.phone IS DISTINCT FROM NEW.phone OR
    OLD.role IS DISTINCT FROM NEW.role OR
    OLD.identity_verified IS DISTINCT FROM NEW.identity_verified OR
    OLD.business_name IS DISTINCT FROM NEW.business_name
  )
  EXECUTE FUNCTION public.trigger_zendesk_sync();

-- Add comment for documentation
COMMENT ON FUNCTION public.trigger_zendesk_sync() IS 'Triggers Zendesk user sync when profiles are created or updated';
