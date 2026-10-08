-- Campus Partner program: extends the existing transaction promo system
-- (promo_codes + promo_code_uses) instead of adding a parallel one.
ALTER TABLE public.promo_codes DROP CONSTRAINT IF EXISTS promo_codes_discount_type_check;
ALTER TABLE public.promo_codes ADD CONSTRAINT promo_codes_discount_type_check
  CHECK (discount_type = ANY (ARRAY['percentage','fixed','campus_partner']));

ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS program text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS partner_name text,
  ADD COLUMN IF NOT EXISTS normalized_code text GENERATED ALWAYS AS (upper(regexp_replace(code, '\s', '', 'g'))) STORED,
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS academic_year text,
  ADD COLUMN IF NOT EXISTS rental_percent numeric(5,2),
  ADD COLUMN IF NOT EXISTS rental_cap_cents integer,
  ADD COLUMN IF NOT EXISTS purchase_credit_cents integer,
  ADD COLUMN IF NOT EXISTS purchase_min_cents integer,
  ADD COLUMN IF NOT EXISTS rental_uses_per_user integer,
  ADD COLUMN IF NOT EXISTS purchase_uses_per_user integer;

ALTER TABLE public.promo_codes ADD CONSTRAINT promo_codes_program_check CHECK (program IN ('standard','campus_partner'));
ALTER TABLE public.promo_codes ADD CONSTRAINT promo_codes_campus_values_check CHECK (
  program <> 'campus_partner' OR (
    partner_name IS NOT NULL AND rental_percent > 0 AND rental_percent <= 100
    AND rental_cap_cents >= 0 AND purchase_credit_cents >= 0 AND purchase_min_cents >= 0
    AND rental_uses_per_user >= 0 AND purchase_uses_per_user >= 0
  ));
CREATE UNIQUE INDEX IF NOT EXISTS promo_codes_normalized_code_key ON public.promo_codes (normalized_code);

ALTER TABLE public.promo_code_uses
  ADD COLUMN IF NOT EXISTS payment_record_id uuid REFERENCES public.payment_records(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS redemption_kind text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS eligible_base_cents integer,
  ADD COLUMN IF NOT EXISTS credit_cents integer,
  ADD COLUMN IF NOT EXISTS gross_cents integer,
  ADD COLUMN IF NOT EXISTS platform_fee_cents integer,
  ADD COLUMN IF NOT EXISTS refunded_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS released_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.promo_code_uses ADD CONSTRAINT promo_code_uses_kind_check CHECK (redemption_kind IS NULL OR redemption_kind IN ('rental','purchase'));
ALTER TABLE public.promo_code_uses ADD CONSTRAINT promo_code_uses_status_check CHECK (status IN ('reserved','completed','partially_refunded','released'));
CREATE UNIQUE INDEX IF NOT EXISTS promo_code_uses_payment_record_key ON public.promo_code_uses (payment_record_id) WHERE payment_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS promo_code_uses_limit_idx ON public.promo_code_uses (promo_code_id, user_id, redemption_kind, status);

-- Counts a user's live redemptions of a code for one benefit kind.
CREATE OR REPLACE FUNCTION public.partner_code_active_uses(p_code_id uuid, p_user uuid, p_kind text, p_exclude_record uuid DEFAULT NULL)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.promo_code_uses u
  WHERE u.promo_code_id = p_code_id AND u.user_id = p_user AND u.redemption_kind = p_kind
    AND (p_exclude_record IS NULL OR u.payment_record_id IS DISTINCT FROM p_exclude_record)
    AND (u.status IN ('completed','partially_refunded')
         OR (u.status = 'reserved' AND u.updated_at > now() - interval '30 minutes'))
$$;

-- Atomic, idempotent reservation tied to one payment record.
CREATE OR REPLACE FUNCTION public.reserve_partner_redemption(
  p_code_id uuid, p_user uuid, p_kind text, p_payment_record uuid,
  p_credit_cents integer, p_base_cents integer, p_gross_cents integer, p_platform_fee_cents integer)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.promo_codes%ROWTYPE; lim integer; used integer;
BEGIN
  IF p_kind NOT IN ('rental','purchase') THEN RETURN 'invalid_kind'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_code_id::text || ':' || p_user::text || ':' || p_kind, 0));
  IF EXISTS (SELECT 1 FROM public.promo_code_uses WHERE payment_record_id = p_payment_record) THEN
    UPDATE public.promo_code_uses SET updated_at = now() WHERE payment_record_id = p_payment_record AND status = 'reserved';
    RETURN 'ok';
  END IF;
  SELECT * INTO c FROM public.promo_codes WHERE id = p_code_id;
  IF NOT FOUND OR NOT c.is_active OR c.program <> 'campus_partner'
     OR (c.starts_at IS NOT NULL AND c.starts_at > now())
     OR (c.expires_at IS NOT NULL AND c.expires_at <= now()) THEN RETURN 'inactive'; END IF;
  lim := CASE WHEN p_kind = 'rental' THEN c.rental_uses_per_user ELSE c.purchase_uses_per_user END;
  used := public.partner_code_active_uses(p_code_id, p_user, p_kind, p_payment_record);
  IF used >= coalesce(lim, 0) THEN RETURN 'limit_reached'; END IF;
  INSERT INTO public.promo_code_uses (promo_code_id, user_id, payment_record_id, redemption_kind, status,
    credit_cents, discount_applied, eligible_base_cents, gross_cents, platform_fee_cents)
  VALUES (p_code_id, p_user, p_payment_record, p_kind, 'reserved',
    p_credit_cents, p_credit_cents / 100.0, p_base_cents, p_gross_cents, p_platform_fee_cents);
  RETURN 'ok';
END $$;

-- Keeps redemptions in step with the payment, whatever provider or path
-- (capture, webhook, refund, admin) changed it.
CREATE OR REPLACE FUNCTION public.sync_partner_redemption()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u public.promo_code_uses%ROWTYPE; refunded integer; new_status text; evt text;
BEGIN
  SELECT * INTO u FROM public.promo_code_uses WHERE payment_record_id = NEW.id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  refunded := coalesce(NEW.refunded_cents, 0);
  new_status := u.status;
  IF NEW.payment_status::text = 'refunded' OR (refunded > 0 AND refunded >= coalesce(NEW.gross_amount_cents, 0)) THEN
    IF u.status IN ('completed','partially_refunded') THEN evt := 'partner_transaction_refunded'; END IF;
    new_status := 'released';
  ELSIF NEW.payment_status::text IN ('failed','cancelled','declined','reversed','authorization_voided','authorization_expired') THEN
    IF u.status = 'reserved' THEN new_status := 'released'; END IF;
  ELSIF NEW.payment_status::text = 'partially_refunded' OR refunded > 0 THEN
    IF u.status IN ('completed','reserved','partially_refunded') THEN
      IF u.status <> 'partially_refunded' THEN evt := 'partner_transaction_refunded'; END IF;
      new_status := 'partially_refunded';
    END IF;
  ELSIF NEW.payment_status::text = 'completed' AND u.status = 'reserved' THEN
    new_status := 'completed'; evt := 'partner_transaction_completed';
  END IF;

  IF new_status IS DISTINCT FROM u.status OR refunded IS DISTINCT FROM u.refunded_cents THEN
    UPDATE public.promo_code_uses SET status = new_status, refunded_cents = refunded, updated_at = now(),
      completed_at = CASE WHEN new_status IN ('completed','partially_refunded') THEN coalesce(completed_at, now()) ELSE completed_at END,
      released_at = CASE WHEN new_status = 'released' THEN now() ELSE released_at END
    WHERE id = u.id;
    IF evt IS NOT NULL THEN
      INSERT INTO public.analytics_events (user_id, event_name, event_category, listing_id, metadata)
      VALUES (u.user_id, evt, 'campus_partner', NEW.listing_id, jsonb_build_object(
        'promo_code_id', u.promo_code_id, 'kind', u.redemption_kind, 'credit_cents', u.credit_cents,
        'refunded_cents', refunded, 'full_refund', new_status = 'released'));
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_partner_redemption ON public.payment_records;
CREATE TRIGGER trg_sync_partner_redemption AFTER UPDATE OF payment_status, refunded_cents ON public.payment_records
FOR EACH ROW EXECUTE FUNCTION public.sync_partner_redemption();

REVOKE ALL ON FUNCTION public.reserve_partner_redemption(uuid,uuid,text,uuid,integer,integer,integer,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.partner_code_active_uses(uuid,uuid,text,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_partner_redemption() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_partner_redemption(uuid,uuid,text,uuid,integer,integer,integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.partner_code_active_uses(uuid,uuid,text,uuid) TO service_role;

-- Admin-only aggregate report. No buyer, payment or provider identifiers.
CREATE OR REPLACE VIEW public.campus_partner_summary WITH (security_invoker = on) AS
SELECT c.id, c.partner_name, c.code, c.academic_year, c.is_active, c.starts_at, c.expires_at,
  c.rental_percent, c.rental_cap_cents, c.purchase_credit_cents, c.purchase_min_cents,
  c.rental_uses_per_user, c.purchase_uses_per_user,
  count(u.id) FILTER (WHERE u.status IN ('completed','partially_refunded'))::int AS redemptions,
  count(u.id) FILTER (WHERE u.status IN ('completed','partially_refunded') AND u.redemption_kind = 'rental')::int AS rental_redemptions,
  count(u.id) FILTER (WHERE u.status IN ('completed','partially_refunded') AND u.redemption_kind = 'purchase')::int AS purchase_redemptions,
  count(DISTINCT u.user_id) FILTER (WHERE u.status IN ('completed','partially_refunded'))::int AS unique_users,
  coalesce(sum(u.gross_cents + u.credit_cents) FILTER (WHERE u.status IN ('completed','partially_refunded') AND u.redemption_kind = 'rental'), 0)::bigint AS rental_gmv_cents,
  coalesce(sum(u.gross_cents + u.credit_cents) FILTER (WHERE u.status IN ('completed','partially_refunded') AND u.redemption_kind = 'purchase'), 0)::bigint AS purchase_gmv_cents,
  coalesce(sum(u.credit_cents) FILTER (WHERE u.status IN ('completed','partially_refunded')), 0)::bigint AS total_credit_cents,
  count(u.id) FILTER (WHERE u.refunded_cents > 0)::int AS refunded_transactions,
  coalesce(sum(u.refunded_cents), 0)::bigint AS refunded_cents,
  coalesce(sum(u.platform_fee_cents) FILTER (WHERE u.status IN ('completed','partially_refunded')), 0)::bigint AS platform_fee_cents,
  coalesce(sum(u.platform_fee_cents - u.credit_cents) FILTER (WHERE u.status IN ('completed','partially_refunded')), 0)::bigint AS net_platform_revenue_cents
FROM public.promo_codes c
LEFT JOIN public.promo_code_uses u ON u.promo_code_id = c.id
WHERE c.program = 'campus_partner' AND public.is_admin(auth.uid())
GROUP BY c.id;

GRANT SELECT ON public.campus_partner_summary TO authenticated;
GRANT ALL ON public.campus_partner_summary TO service_role;