
-- 1) Booking requests: reject forged privileged fields at insert time.
DROP POLICY IF EXISTS "Shoppers can create booking requests" ON public.booking_requests;
CREATE POLICY "Shoppers can create booking requests"
ON public.booking_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = shopper_id
  AND payment_status = 'unpaid'
  AND deposit_status = 'pending'
  AND hold_status = 'none'
  AND status = 'pending'::booking_status
  AND host_confirmed_at IS NULL
  AND payment_intent_id IS NULL
);

-- 2) Monetization purchases: must start pending / unfulfilled.
DROP POLICY IF EXISTS "Users insert own pending purchases" ON public.monetization_purchases;
CREATE POLICY "Users insert own pending purchases"
ON public.monetization_purchases
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'::monetization_purchase_status
  AND fulfillment_status = 'pending'
);

-- 3) Profiles: cover every server-controlled trust/verification column.
--    show_verified_badge stays user-editable (display preference only; the
--    badge itself still requires identity_verified, which is protected here).
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
  NEW.referral_w9_collected := OLD.referral_w9_collected;
  NEW.paypal_payout_verified_at := OLD.paypal_payout_verified_at;
  RETURN NEW;
END;
$$;
