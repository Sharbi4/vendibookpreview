
UPDATE public.listings
   SET guest_draft_token = NULL
 WHERE status = 'published' AND guest_draft_token IS NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_no_guest_token_on_published()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'published' AND NEW.guest_draft_token IS NOT NULL THEN
    NEW.guest_draft_token := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listings_clear_guest_token ON public.listings;
CREATE TRIGGER trg_listings_clear_guest_token
BEFORE INSERT OR UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.enforce_no_guest_token_on_published();

DROP POLICY IF EXISTS "Anyone can view active promo codes by code" ON public.promo_codes;
DROP POLICY IF EXISTS "Anyone can view active promo codes" ON public.promo_codes;

CREATE OR REPLACE FUNCTION public.lookup_promo_code(p_code text)
RETURNS TABLE (
  id uuid,
  code text,
  discount_type text,
  discount_value numeric,
  max_uses integer,
  current_uses integer,
  min_purchase_amount numeric,
  applies_to text,
  expires_at timestamptz,
  is_active boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pc.id, pc.code, pc.discount_type, pc.discount_value,
         pc.max_uses, pc.current_uses, pc.min_purchase_amount,
         pc.applies_to, pc.expires_at, pc.is_active
  FROM public.promo_codes pc
  WHERE pc.is_active = true
    AND length(trim(coalesce(p_code, ''))) > 0
    AND upper(pc.code) = upper(trim(p_code))
    AND (pc.expires_at IS NULL OR pc.expires_at > now())
    AND (pc.max_uses IS NULL OR pc.current_uses < pc.max_uses)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_promo_code(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.purge_expired_permit_soft_deletes()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.permit_documents
   WHERE deleted_at IS NOT NULL AND deleted_at < now() - INTERVAL '7 days';
  DELETE FROM public.saved_permit_roadmaps
   WHERE deleted_at IS NOT NULL AND deleted_at < now() - INTERVAL '7 days';
END;
$$;

DO $$ BEGIN
  PERFORM cron.unschedule('purge-expired-permit-soft-deletes');
EXCEPTION WHEN OTHERS THEN NULL;
END$$;

SELECT cron.schedule(
  'purge-expired-permit-soft-deletes',
  '0 9 * * *',
  $$SELECT public.purge_expired_permit_soft_deletes();$$
);
