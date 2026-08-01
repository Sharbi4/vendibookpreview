ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'clear';

ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS listings_moderation_status_check;
ALTER TABLE public.listings
  ADD CONSTRAINT listings_moderation_status_check
  CHECK (moderation_status IN ('clear','pending_review','rejected','restricted'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_suspended boolean NOT NULL DEFAULT false;

UPDATE public.listings
   SET published_at = COALESCE(published_at, created_at)
 WHERE status = 'published' AND published_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_listings_public_visibility
  ON public.listings (status, published_at)
  WHERE deleted_at IS NULL;

-- Canonical public eligibility predicate. SECURITY DEFINER so the owner
-- suspension lookup on profiles is not blocked by profiles RLS.
CREATE OR REPLACE FUNCTION public.is_listing_publicly_visible(_listing_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.listings l
    LEFT JOIN public.profiles p ON p.id = l.host_id
    WHERE l.id = _listing_id
      AND l.status = 'published'::listing_status
      AND l.published_at IS NOT NULL
      AND l.deleted_at IS NULL
      AND COALESCE(l.moderation_status,'clear') = 'clear'
      AND (l.host_id IS NULL OR COALESCE(p.account_suspended,false) = false)
  );
$$;

-- Owner-suspension lookup used inline by the public RLS policy.
CREATE OR REPLACE FUNCTION public.is_host_account_active(_host_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _host_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _host_id AND COALESCE(p.account_suspended,false) = true
  );
$$;

DROP POLICY IF EXISTS "Anyone can view published listings" ON public.listings;
CREATE POLICY "Public can view eligible listings"
ON public.listings
FOR SELECT
USING (
  status = 'published'::listing_status
  AND published_at IS NOT NULL
  AND deleted_at IS NULL
  AND COALESCE(moderation_status,'clear') = 'clear'
  AND public.is_host_account_active(host_id)
);

DROP POLICY IF EXISTS "Admins can view all listings" ON public.listings;
CREATE POLICY "Admins can view all listings"
ON public.listings
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Server-side purchasability gate used by every payment/booking function.
CREATE OR REPLACE FUNCTION public.listing_purchase_state(_listing_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l public.listings;
  suspended boolean := false;
BEGIN
  SELECT * INTO l FROM public.listings WHERE id = _listing_id;
  IF l.id IS NULL THEN
    RETURN jsonb_build_object('purchasable', false, 'reason', 'not_found', 'status', NULL);
  END IF;

  SELECT COALESCE(p.account_suspended,false) INTO suspended
  FROM public.profiles p WHERE p.id = l.host_id;

  IF l.deleted_at IS NOT NULL THEN
    RETURN jsonb_build_object('purchasable', false, 'reason', 'deleted', 'status', l.status::text);
  END IF;
  IF COALESCE(l.moderation_status,'clear') <> 'clear' THEN
    RETURN jsonb_build_object('purchasable', false, 'reason', 'moderation_' || l.moderation_status, 'status', l.status::text);
  END IF;
  IF COALESCE(suspended,false) THEN
    RETURN jsonb_build_object('purchasable', false, 'reason', 'owner_suspended', 'status', l.status::text);
  END IF;
  IF l.status <> 'published'::listing_status OR l.published_at IS NULL THEN
    RETURN jsonb_build_object('purchasable', false, 'reason', 'not_published', 'status', l.status::text);
  END IF;

  RETURN jsonb_build_object('purchasable', true, 'reason', 'ok', 'status', l.status::text, 'host_id', l.host_id, 'title', l.title);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_listing_publicly_visible(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_host_account_active(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.listing_purchase_state(uuid) TO authenticated, service_role;