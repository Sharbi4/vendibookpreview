-- Instant enforcement: clear public promotion artifacts the moment a listing
-- leaves publicly-visible state (paused, draft, archived, deleted, flagged).
CREATE OR REPLACE FUNCTION public.trg_clear_promos_when_not_public()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_public boolean;
BEGIN
  is_public := NEW.status = 'published'::listing_status
    AND NEW.published_at IS NOT NULL
    AND NEW.deleted_at IS NULL
    AND COALESCE(NEW.moderation_status, 'clear') = 'clear';

  IF NOT is_public THEN
    NEW.featured_enabled := false;

    UPDATE public.listing_promotions
       SET active = false, updated_at = now()
     WHERE listing_id = NEW.id AND active IS TRUE;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clear_promos_when_not_public ON public.listings;
CREATE TRIGGER clear_promos_when_not_public
BEFORE UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.trg_clear_promos_when_not_public();

-- Backstop sweep, run on a schedule. Returns what it cleaned up.
CREATE OR REPLACE FUNCTION public.sweep_non_public_listing_artifacts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  featured_cleared int := 0;
  promos_cleared int := 0;
BEGIN
  WITH cleaned AS (
    UPDATE public.listings
       SET featured_enabled = false
     WHERE featured_enabled IS TRUE
       AND NOT (
         status = 'published'::listing_status
         AND published_at IS NOT NULL
         AND deleted_at IS NULL
         AND COALESCE(moderation_status, 'clear') = 'clear'
       )
    RETURNING 1
  )
  SELECT count(*) INTO featured_cleared FROM cleaned;

  WITH cleaned AS (
    UPDATE public.listing_promotions p
       SET active = false, updated_at = now()
      FROM public.listings l
     WHERE p.listing_id = l.id
       AND p.active IS TRUE
       AND NOT (
         l.status = 'published'::listing_status
         AND l.published_at IS NOT NULL
         AND l.deleted_at IS NULL
         AND COALESCE(l.moderation_status, 'clear') = 'clear'
       )
    RETURNING 1
  )
  SELECT count(*) INTO promos_cleared FROM cleaned;

  RETURN jsonb_build_object(
    'featured_cleared', featured_cleared,
    'promotions_deactivated', promos_cleared,
    'swept_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sweep_non_public_listing_artifacts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sweep_non_public_listing_artifacts() TO service_role;