# Square billing rollout — not enabled yet

## Scope
New Vendibook catalog subscriptions and one-time catalog add-ons use Square. Marketplace sales, rentals and seller onboarding remain PayPal. Existing PayPal subscriptions retain cancellation, webhook processing and paid-period access; do not delete those integrations or automatically re-enroll customers.

## Required backend configuration
Revoke the production access token shared in chat. Save its replacement only in backend secrets as `SQUARE_ACCESS_TOKEN`; never in frontend VITE variables or GitHub.

- `SQUARE_ENVIRONMENT=production` (use `sandbox` with separate test credentials for testing)
- `SQUARE_APPLICATION_ID=sq0idp-88LdFlgtOeJ8voMTCtRwnw`
- `SQUARE_LOCATION_ID=LQKF8A6PRKSRM`
- `SQUARE_WEBHOOK_SIGNATURE_KEY` from the Square Developer Console
- `SQUARE_WEBHOOK_URL` exactly matching the deployed square-webhook URL
- Keep `SQUARE_MONETIZATION_ENABLED=false` until acceptance tests pass.

Deploy only migration `20260920020000_square_billing.sql` and functions `square-billing`, `square-webhook`, and `square-reconcile`. Do not deploy the unrelated profile-identity or PayPal migrations as part of this rollout.
Configure square-webhook with JWT verification disabled; its HMAC verifier authenticates the exact URL and raw body. Subscribe to payment.created, payment.updated, subscription.created, subscription.updated, invoice.payment_made, invoice.updated. Add refund/dispute handling before production enablement.

Create single-paid-phase STATIC Square catalog plan variations for each monthly/quarterly/annual product and insert their IDs/prices into `square_billing_plans` for the matching environment. Runtime compares the variation price/currency/cadence to this mapping before allowing payment. No automatic migration of existing cards or subscriptions.

Email receipts are issued by Square. Subscription access only starts after the latest invoice is PAID. Failed renewal and cancelled-period expiry need scheduled reconciliation; do not rely solely on a browser status check.

## Remaining rollout gates
- Configure sandbox credentials and isolated test backend; the current supplied credentials are production only. Do not test with a real card.
- Schedule square-reconcile every 15 minutes with a service-role Authorization header (stored in backend Vault, never in frontend code); validate expiry across all entitlement readers.
- Add refund/dispute reconciliation and customer payment-method updates.
- Inventory and migrate special noncatalog charges (freight, notary, concierge, verification) separately; current catalog migration does not move these bespoke flows.
- Verify recurring consent, each price/interval, failed card, duplicate submission, webhook-before-response, duplicate/out-of-order webhooks, cancellation, expired access, plan price mismatch, wrong-owner listing, missing credentials and return/reload.
- Confirm legacy PayPal subscription cancellation and marketplace checkout remain functional.

This implementation must remain disabled until these gates are addressed. A GitHub push does not deploy Supabase functions, apply migrations, configure Square, or prove live payment readiness.
