
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS featured_source TEXT;

UPDATE public.listings
  SET featured_source = 'paid'
  WHERE featured_enabled = true
    AND pending_featured_payment IS NOT NULL
    AND featured_source IS NULL;

CREATE OR REPLACE FUNCTION public.admin_grant_complimentary_featured(
  p_listing_id uuid,
  p_days integer DEFAULT 30
)
RETURNS public.listings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.listings;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  IF p_days IS NULL OR p_days < 1 OR p_days > 365 THEN
    RAISE EXCEPTION 'p_days must be between 1 and 365';
  END IF;

  UPDATE public.listings SET
    featured_enabled    = true,
    featured_at         = now(),
    featured_expires_at = now() + (p_days || ' days')::interval,
    featured_source     = 'comp'
  WHERE id = p_listing_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_grant_complimentary_featured(uuid, integer) TO authenticated;
