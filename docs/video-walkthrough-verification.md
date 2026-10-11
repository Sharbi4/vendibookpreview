# Video walkthrough verification

## Fixed
- Configured Daily webhook/join callbacks to reach their signature/shared-secret handlers without a Supabase JWT. User access, exit, recording access, notification and admin-bootstrap endpoints retain their own verified-user checks.
- Join access and recording start share the same current-version, meeting-specific consent check. Global acceptance is no longer a substitute for recording consent for this call.
- Daily event deduplication uses the provider event ID when present; mtg_session_id is recognized. Only unique violations are acknowledged as duplicates; event-storage errors return 503.
- A later recording-ready event can recover an earlier recording-error state, as documented by Daily.
- Bootstrap refuses to create a subscription if listing existing subscriptions failed.

## Verified
25 tests passed: meeting profiles, signature validation, recording consent, duplicate delivery and event-storage failure. Existing call component registers join/leave/error listeners and destroys the call on exit. The connected database has handoff_media_refresh_sale_release, which connects uploaded handoff evidence to sale-release requirements. A scheduled remote walkthrough is separate from the handoff-evidence upload; a call alone does not release payment.

## Activation required
Deploy daily-webhook, daily-meeting-join-hook, daily-webhook-bootstrap and video-walkthrough-access with the updated shared recording helper and config; apply the config to video-walkthrough-recording-access, video-walkthrough-exit and video-walkthrough-notify. Confirm DAILY_API_KEY, DAILY_DOMAIN, DAILY_WEBHOOK_HMAC and DAILY_JOIN_HOOK_SECRET are configured (never expose values). As an administrator, invoke daily-webhook-bootstrap. The connected database had no daily_webhook_config or daily_webhook_events rows at inspection, so provider registration/delivery is not verified.

Run a two-participant test: schedule, consent as both parties, join, verify presence and recording start, leave, await ready-to-download, confirm participant-only playback and notifications. Separately upload a handoff walkthrough and check release requirements remain incomplete until the agreement/signature conditions are satisfied. Verify outsiders cannot obtain meeting tokens or recording URLs.

## Remaining reliability limits
The existing webhook handler still records processing failures for review after event insertion; this patch does not add an automatic replay worker for those failures. Simultaneous/out-of-order deliveries beyond the cases tested require further integration testing. No live Daily call, notification send, or payout was initiated in this review.
