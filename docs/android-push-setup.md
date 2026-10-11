# Android push notifications

Firebase project: `vendibook-e242d`; Android package: `com.vendibook.app`.

## Deployment

- Apply migration `20260926190000_native_push.sql` once. It creates owner-only device registration, a private delivery queue, notification trigger, retry cron and authenticated test RPC. This migration was applied to the connected backend on 2026-09-26.
- Save the full Firebase service-account JSON in backend secret `FIREBASE_SERVICE_ACCOUNT_JSON`. Never commit it. `android/app/google-services.json` is the separate public Android SDK configuration.
- Deploy the `send-native-push` edge function with its configuration in `supabase/config.toml`. JWT checking is disabled because each request must authenticate a private per-job capability; notification content and recipients are loaded from the database.
- Ensure Firebase Cloud Messaging HTTP v1 is enabled and the service account can send messages for this project.
- Build the web app, run `npx cap sync android`, sync Gradle using JVM 21 and rebuild/install the Android app. Publishing the website does not update bundled Android assets.

## Device acceptance test

Sign in on Android, open notification settings, enable push, accept Android permission, then use Test notification. Background the app and tap the received notification. Verify the correct account page opens. Disable notifications and confirm further updates are not sent to that device. Sign out and switch accounts to verify private content is not exposed.

## Delivery and privacy

Lock-screen copy is generic. Only an authenticated account may register its own device. Jobs deduplicate by notification and token; competing requests claim the same job atomically. Only explicit FCM UNREGISTERED responses remove device registrations. Rate limits and explicit temporary failures retry up to five attempts. Ambiguous send timeouts remain `sending` for investigation rather than automatically duplicating an alert. Review `native_push_jobs` for `failed` and `sending` older than five minutes; do not log tokens, capabilities, or credentials. Notification creation succeeds even if immediate dispatch fails. The test RPC is account-scoped and rate-limited.

## Validation

34 focused native navigation, registration and delivery-policy tests pass. Database queue generation and owner isolation were checked inside a rolled-back transaction without sending customer notifications. Physical Android delivery still requires the device acceptance test.
