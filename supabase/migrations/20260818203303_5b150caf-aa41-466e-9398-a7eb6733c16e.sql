
CREATE OR REPLACE FUNCTION public.protect_profile_stripe_columns()
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

  IF auth.uid() IS NOT NULL AND auth.uid() = NEW.id THEN
    NEW.stripe_account_id := OLD.stripe_account_id;
    NEW.stripe_onboarding_complete := OLD.stripe_onboarding_complete;
    NEW.stripe_identity_session_id := OLD.stripe_identity_session_id;
    NEW.identity_verified := OLD.identity_verified;
    NEW.identity_verified_at := OLD.identity_verified_at;
    NEW.account_suspended := OLD.account_suspended;
    NEW.referral_suspended := OLD.referral_suspended;
    NEW.referral_ytd_earnings := OLD.referral_ytd_earnings;
    IF COALESCE(NEW.show_verified_badge, false) AND NOT COALESCE(OLD.identity_verified, false) THEN
      NEW.show_verified_badge := OLD.show_verified_badge;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_listing_paid_entitlements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := COALESCE(current_setting('request.jwt.claims', true)::jsonb ->> 'role', current_user);
  v_privileged boolean;
BEGIN
  v_privileged := v_role IN ('service_role','postgres','supabase_admin') OR public.is_admin(auth.uid());

  IF v_privileged THEN
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

  IF COALESCE(NEW.featured_enabled, false) AND NOT COALESCE(OLD.featured_enabled, false) THEN
    NEW.featured_enabled := OLD.featured_enabled;
  END IF;
  NEW.featured_expires_at := OLD.featured_expires_at;
  NEW.featured_at := OLD.featured_at;
  NEW.featured_source := OLD.featured_source;

  IF COALESCE(NEW.proof_notary_enabled, false) AND NOT COALESCE(OLD.proof_notary_enabled, false) THEN
    NEW.proof_notary_enabled := OLD.proof_notary_enabled;
  END IF;

  NEW.moderation_status := OLD.moderation_status;
  NEW.boost_history := OLD.boost_history;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.enqueue_email(queue_name text, payload jsonb) SET search_path = public, pgmq, extensions;
ALTER FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer) SET search_path = public, pgmq, extensions;
ALTER FUNCTION public.delete_email(queue_name text, message_id bigint) SET search_path = public, pgmq, extensions;
ALTER FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb) SET search_path = public, pgmq, extensions;

REVOKE EXECUTE ON FUNCTION public.enqueue_email(queue_name text, payload jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(queue_name text, message_id bigint) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb) FROM anon, authenticated;
