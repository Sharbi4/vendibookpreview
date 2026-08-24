DO $$
DECLARE
  keep text[] := ARRAY[
    'has_role', 'is_admin', 'is_document_participant', 'is_host_account_active',
    'is_listing_publicly_visible', 'has_permit_path_plus',
    'current_legal_document', 'get_all_asset_requests', 'update_asset_request_status',
    'get_conversation_participant_profile', 'get_hero_listings', 'get_listing_busy_slots',
    'get_listing_reviews_safe', 'get_listing_favorite_count', 'get_safe_host_profile',
    'get_host_verification_status', 'is_seller_identity_verified', 'seller_identity_badges',
    'merge_permit_item', 'refresh_permit_roadmap', 'rename_permit_document',
    'rename_permit_roadmap', 'restore_permit_document', 'restore_permit_roadmap',
    'soft_delete_permit_document', 'soft_delete_permit_roadmap',
    'record_user_consent', 'revoke_user_consent', 'acknowledge_transaction_terms',
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
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', r.oid::regprocedure);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated', r.oid::regprocedure);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.oid::regprocedure);
  END LOOP;
END $$;