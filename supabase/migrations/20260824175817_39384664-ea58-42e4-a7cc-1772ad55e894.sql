-- 1) listing_financing_preferences: scope public read to publicly visible listings
DROP POLICY IF EXISTS "Financing opt-in is publicly readable" ON public.listing_financing_preferences;
CREATE POLICY "Financing opt-in readable for public listings"
ON public.listing_financing_preferences
FOR SELECT
TO anon, authenticated
USING (public.is_listing_publicly_visible(listing_id));

-- 2) payment_attempts: buyers no longer read the raw table (internal diagnostics);
--    admins keep full access; buyers get a column-limited self-scoped view.
DROP POLICY IF EXISTS "Buyers view their own payment attempts" ON public.payment_attempts;
CREATE POLICY "Admins view all payment attempts"
ON public.payment_attempts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE VIEW public.payment_attempts_safe AS
SELECT
  id,
  payment_record_id,
  buyer_id,
  provider,
  provider_order_id,
  attempt_number,
  status,
  failure_category,
  failure_code,
  failure_message_safe,
  created_at,
  updated_at,
  completed_at
FROM public.payment_attempts
WHERE buyer_id = auth.uid();

GRANT SELECT ON public.payment_attempts_safe TO authenticated;
GRANT SELECT ON public.payment_attempts_safe TO service_role;

-- 3) Revoke EXECUTE from anon/authenticated on internal SECURITY DEFINER
--    functions. Keeps user-facing helpers and RLS policy functions callable.
DO $$
DECLARE
  keep text[] := ARRAY[
    -- RLS policy helpers (must stay executable for policy evaluation)
    'has_role', 'is_admin', 'is_document_participant', 'is_host_account_active',
    'is_listing_publicly_visible', 'has_permit_path_plus',
    -- Frontend RPC surface
    'current_legal_document', 'get_all_asset_requests', 'update_asset_request_status',
    'get_conversation_participant_profile', 'get_hero_listings', 'get_listing_busy_slots',
    'get_listing_reviews_safe', 'get_listing_favorite_count', 'get_safe_host_profile',
    'get_host_verification_status', 'is_seller_identity_verified', 'seller_identity_badges',
    'merge_permit_item', 'refresh_permit_roadmap', 'rename_permit_document',
    'rename_permit_roadmap', 'restore_permit_document', 'restore_permit_roadmap',
    'soft_delete_permit_document', 'soft_delete_permit_roadmap',
    'record_user_consent', 'revoke_user_consent', 'acknowledge_transaction_terms',
    -- User-context edge-function RPCs
    'check_booking_availability', 'listing_purchase_state',
    'claim_seller_verification_retry', 'release_seller_verification_retry',
    'get_my_seller_verification', 'admin_update_referral_config',
    'count_purchase_referrals_this_month', 'increment_referral_counter',
    'log_referral_status_change', 'lookup_referral_code', 'lookup_promo_code',
    'get_referral_leaderboard', 'public_display_name', 'get_user_roles',
    'get_feedback_by_token', 'submit_feedback_by_token', 'submit_general_feedback',
    'host_active_listing_limit', 'user_has_tier', 'increment_listing_view_count'
  ];
  r record;
BEGIN
  FOR r IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.proname <> ALL (keep)
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated', r.oid::regprocedure);
  END LOOP;
END $$;