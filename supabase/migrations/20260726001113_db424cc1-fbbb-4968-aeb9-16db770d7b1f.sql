CREATE OR REPLACE FUNCTION public.enforce_listing_publish_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_grandfathered boolean;
  v_tier text;
  v_limit int;
  v_active_count int;
  v_becoming_published boolean;
BEGIN
  -- Only run when the row is transitioning INTO published.
  IF TG_OP = 'INSERT' THEN
    v_becoming_published := (NEW.status = 'published'::listing_status);
  ELSE
    -- IS DISTINCT FROM handles NULL safely without a bogus empty-string cast.
    v_becoming_published := (
      NEW.status = 'published'::listing_status
      AND OLD.status IS DISTINCT FROM 'published'::listing_status
    );
  END IF;

  IF NOT v_becoming_published THEN
    RETURN NEW;
  END IF;

  -- Grandfathered accounts: unlimited, always.
  SELECT COALESCE(grandfathered_listings, false)
    INTO v_grandfathered
  FROM public.profiles
  WHERE id = NEW.host_id;

  IF v_grandfathered THEN
    RETURN NEW;
  END IF;

  -- Resolve active subscription tier.
  SELECT tier INTO v_tier
  FROM public.host_subscriptions
  WHERE user_id = NEW.host_id
    AND status IN ('active', 'trialing', 'past_due')
  ORDER BY updated_at DESC
  LIMIT 1;

  -- Map tier → limit (NULL means unlimited).
  v_limit := CASE
    WHEN v_tier IS NULL THEN 2
    WHEN lower(v_tier) IN ('host_growth', 'host-growth', 'host_growth_annual', 'host_growth_monthly',
                           'host_operator', 'host-operator', 'host_operator_annual', 'host_operator_monthly',
                           'pro', 'premium') THEN NULL
    WHEN lower(v_tier) IN ('host_starter', 'host-starter', 'host_starter_annual', 'host_starter_monthly',
                           'seller_plus', 'seller-plus', 'starter') THEN 5
    ELSE 2
  END;

  IF v_limit IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count OTHER currently-published listings owned by this host.
  SELECT count(*) INTO v_active_count
  FROM public.listings
  WHERE host_id = NEW.host_id
    AND status = 'published'::listing_status
    AND id <> NEW.id;

  IF v_active_count >= v_limit THEN
    RAISE EXCEPTION 'listing_publish_limit_reached:%:%', COALESCE(v_tier, 'free'), v_limit
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$function$;