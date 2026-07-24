
-- Server-side enforcement of per-tier active-listing quotas.
-- Matches client-side HOST_LISTING_QUOTAS in src/hooks/useListingQuota.ts.

CREATE OR REPLACE FUNCTION public.host_active_listing_limit(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN hs.tier IN ('pro','premium')
         AND hs.status IN ('active','trialing','past_due') THEN NULL
    WHEN hs.tier = 'starter'
         AND hs.status IN ('active','trialing','past_due') THEN 10
    ELSE 3
  END
  FROM public.host_subscriptions hs
  WHERE hs.user_id = _user_id
  ORDER BY hs.updated_at DESC NULLS LAST
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.enforce_host_listing_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer;
  v_count integer;
  v_transition boolean;
BEGIN
  -- Only care about transitions into 'published'.
  v_transition := NEW.status = 'published'
    AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published');
  IF NOT v_transition THEN
    RETURN NEW;
  END IF;

  -- host_id may be null on service-role inserts; skip in that case.
  IF NEW.host_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT public.host_active_listing_limit(NEW.host_id) INTO v_limit;

  -- Free-tier default when no subscription row exists yet.
  IF v_limit IS NULL THEN
    RETURN NEW; -- unlimited
  END IF;

  SELECT count(*) INTO v_count
  FROM public.listings
  WHERE host_id = NEW.host_id
    AND status IN ('published','paused')
    AND id <> NEW.id;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION
      'Host listing quota exceeded (% of % used). Upgrade your plan at /host/plans.',
      v_count, v_limit
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_host_listing_quota ON public.listings;
CREATE TRIGGER trg_enforce_host_listing_quota
BEFORE INSERT OR UPDATE OF status ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.enforce_host_listing_quota();
