CREATE OR REPLACE FUNCTION public.protect_listing_monetized_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claims', true)::jsonb ->> 'role' IS DISTINCT FROM 'service_role'
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.featured_enabled := OLD.featured_enabled;
    NEW.featured_at := OLD.featured_at;
    NEW.featured_expires_at := OLD.featured_expires_at;
    NEW.featured_source := OLD.featured_source;
    NEW.moderation_status := OLD.moderation_status;
    NEW.boost_history := OLD.boost_history;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_listing_monetized_fields ON public.listings;
CREATE TRIGGER protect_listing_monetized_fields
BEFORE UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.protect_listing_monetized_fields();

CREATE OR REPLACE FUNCTION public.protect_profile_trust_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claims', true)::jsonb ->> 'role' IS DISTINCT FROM 'service_role'
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.identity_verified := OLD.identity_verified;
    NEW.show_verified_badge := OLD.show_verified_badge;
    NEW.account_suspended := OLD.account_suspended;
    NEW.stripe_onboarding_complete := OLD.stripe_onboarding_complete;
    NEW.referral_suspended := OLD.referral_suspended;
    NEW.referral_w9_collected := OLD.referral_w9_collected;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_trust_fields ON public.profiles;
CREATE TRIGGER protect_profile_trust_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_trust_fields();