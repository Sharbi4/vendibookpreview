REVOKE ALL ON FUNCTION public.initialize_sale_release_requirements() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_release_from_document() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_release_from_handoff_media() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_release_state_from_payout() FROM PUBLIC, anon, authenticated;