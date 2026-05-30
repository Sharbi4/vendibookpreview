-- Disable Zendesk auto-sync triggers (Zendesk no longer used)
DROP TRIGGER IF EXISTS on_profile_created_sync_zendesk ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_updated_sync_zendesk ON public.profiles;
DROP FUNCTION IF EXISTS public.trigger_zendesk_sync();