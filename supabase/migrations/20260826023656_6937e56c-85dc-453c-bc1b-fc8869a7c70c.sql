-- 1. Promo code redemption integrity ---------------------------------------
CREATE OR REPLACE FUNCTION public.guard_promo_code_uses_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code public.promo_codes%ROWTYPE;
BEGIN
  IF NOT public.is_privileged_financial_writer() THEN
    RAISE EXCEPTION 'Promo redemptions can only be recorded by Vendibook systems.'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_code FROM public.promo_codes WHERE id = NEW.promo_code_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown promo code.' USING ERRCODE = '23503';
  END IF;

  -- Server-derived discount for fixed-amount codes; percentage codes depend on
  -- the purchase total and stay as supplied by the privileged caller.
  IF v_code.discount_type = 'fixed_amount' THEN
    NEW.discount_applied := v_code.discount_value;
  END IF;

  IF NEW.discount_applied IS NULL OR NEW.discount_applied < 0 THEN
    NEW.discount_applied := 0;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_promo_code_uses_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_promo_code_uses_insert ON public.promo_code_uses;
CREATE TRIGGER trg_guard_promo_code_uses_insert
BEFORE INSERT ON public.promo_code_uses
FOR EACH ROW EXECUTE FUNCTION public.guard_promo_code_uses_insert();

DROP POLICY IF EXISTS "Users can record promo usage" ON public.promo_code_uses;
CREATE POLICY "Only Vendibook systems can record promo usage"
ON public.promo_code_uses
FOR INSERT
TO authenticated
WITH CHECK (public.is_privileged_financial_writer());

-- 2. Lock down internal-only SECURITY DEFINER routines ----------------------
REVOKE ALL ON FUNCTION public.increment_listing_view_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_referral_counter(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.count_purchase_referrals_this_month(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_referral_status_change(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_referral_status_change(uuid, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_update_referral_config(text, numeric, numeric, integer, integer, boolean) FROM PUBLIC, anon, authenticated;

-- 3. Admin-only routines: no anonymous access ------------------------------
REVOKE ALL ON FUNCTION public.get_all_asset_requests() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_asset_request_status(uuid, text, text, text) FROM PUBLIC, anon;

-- 4. Authenticated-only user routines: no anonymous access -----------------
REVOKE ALL ON FUNCTION public.user_has_tier(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_permit_path_plus(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_seller_verification() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_conversation_participant_profile(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_user_consent(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.merge_permit_item(uuid, text, jsonb, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.refresh_permit_roadmap(uuid, jsonb, text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rename_permit_document(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rename_permit_roadmap(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_permit_document(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_permit_roadmap(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.soft_delete_permit_document(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.soft_delete_permit_roadmap(uuid) FROM PUBLIC, anon;