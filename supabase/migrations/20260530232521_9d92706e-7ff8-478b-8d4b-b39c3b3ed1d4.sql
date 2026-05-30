-- 1. Add supply tracking columns to referrals
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS listing_id uuid,
  ADD COLUMN IF NOT EXISTS listing_published_at timestamptz,
  ADD COLUMN IF NOT EXISTS supply_first_txn_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_referrals_listing_id ON public.referrals(listing_id) WHERE listing_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_referrals_supply_pending
  ON public.referrals(listing_published_at)
  WHERE program_type = 'supply' AND supply_first_txn_at IS NULL AND status NOT IN ('paid','voided','expired');

-- 2. Trigger function: when a referred user publishes their first eligible listing,
-- upgrade the existing signed_up referral to a supply referral.
CREATE OR REPLACE FUNCTION public.attach_supply_referral_on_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_id uuid;
BEGIN
  -- Only act on transitions into published
  IF NEW.status <> 'published' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN
    RETURN NEW;
  END IF;
  IF NEW.host_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find an unclaimed signed_up referral for this host
  SELECT id INTO v_referral_id
  FROM public.referrals
  WHERE referred_user_id = NEW.host_id
    AND status IN ('signed_up', 'clicked')
    AND (program_type IS NULL OR program_type = 'supply')
    AND listing_id IS NULL
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_referral_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.referrals
    SET program_type = 'supply',
        listing_id = NEW.id,
        listing_published_at = COALESCE(NEW.published_at, now()),
        qualifying_event = 'supply_listing_published',
        updated_at = now()
    WHERE id = v_referral_id;

  PERFORM public.log_referral_status_change(
    v_referral_id,
    'transaction_started',
    'system',
    'Referred user published listing ' || NEW.id::text,
    'listing-publish-' || NEW.id::text,
    'supply_publish'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_attach_supply_referral_on_publish ON public.listings;
CREATE TRIGGER trg_attach_supply_referral_on_publish
  AFTER INSERT OR UPDATE OF status ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.attach_supply_referral_on_publish();