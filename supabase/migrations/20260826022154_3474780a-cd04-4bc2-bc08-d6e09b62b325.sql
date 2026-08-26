CREATE OR REPLACE FUNCTION public.protect_listing_paid_entitlements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := COALESCE(current_setting('request.jwt.claims', true)::jsonb ->> 'role', current_user);
BEGIN
  IF v_role IN ('service_role','postgres','supabase_admin') OR public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.featured_enabled := false;
    NEW.featured_expires_at := NULL;
    NEW.featured_at := NULL;
    NEW.featured_source := NULL;
    NEW.proof_notary_enabled := false;
    RETURN NEW;
  END IF;

  NEW.featured_enabled := OLD.featured_enabled;
  NEW.featured_expires_at := OLD.featured_expires_at;
  NEW.featured_at := OLD.featured_at;
  NEW.featured_source := OLD.featured_source;
  NEW.proof_notary_enabled := OLD.proof_notary_enabled;
  NEW.moderation_status := OLD.moderation_status;
  NEW.boost_history := OLD.boost_history;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_profile_trust_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := COALESCE(current_setting('request.jwt.claims', true)::jsonb ->> 'role', current_user);
BEGIN
  IF v_role IN ('service_role','postgres','supabase_admin') OR public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  NEW.stripe_account_id := OLD.stripe_account_id;
  NEW.stripe_onboarding_complete := OLD.stripe_onboarding_complete;
  NEW.stripe_identity_session_id := OLD.stripe_identity_session_id;
  NEW.identity_verified := OLD.identity_verified;
  NEW.identity_verified_at := OLD.identity_verified_at;
  NEW.account_suspended := OLD.account_suspended;
  NEW.referral_suspended := OLD.referral_suspended;
  NEW.referral_ytd_earnings := OLD.referral_ytd_earnings;
  NEW.show_verified_badge := OLD.show_verified_badge;
  NEW.paypal_payout_verified_at := OLD.paypal_payout_verified_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_stripe_columns ON public.profiles;
DROP TRIGGER IF EXISTS trg_protect_profile_trust_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_trust_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_trust_columns();

CREATE OR REPLACE FUNCTION public.protect_buyer_service_request_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := COALESCE(current_setting('request.jwt.claims', true)::jsonb ->> 'role', current_user);
BEGIN
  IF v_role IN ('service_role','postgres','supabase_admin') OR public.is_admin(auth.uid()) THEN RETURN NEW; END IF;
  NEW.buyer_id := OLD.buyer_id;
  NEW.listing_id := OLD.listing_id;
  NEW.product_key := OLD.product_key;
  NEW.purchase_id := OLD.purchase_id;
  NEW.status := OLD.status;
  NEW.admin_notes := OLD.admin_notes;
  NEW.deliverable := OLD.deliverable;
  NEW.fulfilled_at := OLD.fulfilled_at;
  NEW.cancelled_at := OLD.cancelled_at;
  NEW.refunded_at := OLD.refunded_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_buyer_service_request_columns ON public.buyer_service_requests;
CREATE TRIGGER trg_protect_buyer_service_request_columns
BEFORE UPDATE ON public.buyer_service_requests
FOR EACH ROW EXECUTE FUNCTION public.protect_buyer_service_request_columns();

CREATE OR REPLACE FUNCTION public.protect_permit_concierge_request_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := COALESCE(current_setting('request.jwt.claims', true)::jsonb ->> 'role', current_user);
BEGIN
  IF v_role IN ('service_role','postgres','supabase_admin') OR public.is_admin(auth.uid()) THEN RETURN NEW; END IF;
  NEW.user_id := OLD.user_id;
  NEW.roadmap_id := OLD.roadmap_id;
  NEW.service_level := OLD.service_level;
  NEW.purchase_id := OLD.purchase_id;
  NEW.status := OLD.status;
  NEW.admin_notes := OLD.admin_notes;
  NEW.deliverable := OLD.deliverable;
  NEW.completed_at := OLD.completed_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_permit_concierge_request_columns ON public.permit_concierge_requests;
CREATE TRIGGER trg_protect_permit_concierge_request_columns
BEFORE UPDATE ON public.permit_concierge_requests
FOR EACH ROW EXECUTE FUNCTION public.protect_permit_concierge_request_columns();

CREATE OR REPLACE FUNCTION public.protect_listing_service_order_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := COALESCE(current_setting('request.jwt.claims', true)::jsonb ->> 'role', current_user);
BEGIN
  IF v_role IN ('service_role','postgres','supabase_admin') OR public.is_admin(auth.uid()) THEN RETURN NEW; END IF;
  NEW.buyer_user_id := OLD.buyer_user_id;
  NEW.listing_id := OLD.listing_id;
  NEW.product_slug := OLD.product_slug;
  NEW.purchase_id := OLD.purchase_id;
  NEW.status := OLD.status;
  NEW.admin_user_id := OLD.admin_user_id;
  NEW.revision_count := OLD.revision_count;
  NEW.turnaround_hours := OLD.turnaround_hours;
  NEW.approved_at := OLD.approved_at;
  NEW.published_at := OLD.published_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_listing_service_order_columns ON public.listing_service_orders;
CREATE TRIGGER trg_protect_listing_service_order_columns
BEFORE UPDATE ON public.listing_service_orders
FOR EACH ROW EXECUTE FUNCTION public.protect_listing_service_order_columns();

REVOKE ALL ON FUNCTION public.protect_listing_paid_entitlements() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_profile_trust_columns() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_buyer_service_request_columns() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_permit_concierge_request_columns() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_listing_service_order_columns() FROM PUBLIC, anon, authenticated;