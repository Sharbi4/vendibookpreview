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
    NEW.account_suspended := OLD.account_suspended;
    NEW.stripe_onboarding_complete := OLD.stripe_onboarding_complete;
    NEW.referral_suspended := OLD.referral_suspended;
    NEW.referral_w9_collected := OLD.referral_w9_collected;
  END IF;
  RETURN NEW;
END;
$$;