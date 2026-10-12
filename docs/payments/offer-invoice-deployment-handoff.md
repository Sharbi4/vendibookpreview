# Offer security and invoice-request deployment handoff — 2026-10-12

Branch: `fix/paypal-webhook-config`. All changes were committed directly through
GitHub. The owner deploys and publishes using Lovable.

## Implemented

- Browser offer writes are revoked; authenticated submit/respond RPCs validate
  actor, seller ownership, current acknowledgment, minimum price, expiry and state.
- Listing-first locks serialize duplicate submissions and competing acceptance.
- Submitted identity/price/terms and mutually accepted prices are immutable.
- Offers respect seller opt-out and invoice reservations on the server and in
  all five existing sale detail/action components.
- Buyer and seller dashboards expose query errors with retry instead of silently
  presenting an empty history.
- Accepted offers open the existing checkout in purchase-request mode.
- All new equipment checkout is request-first; no cash-sale endpoint or listing
  payment selector remains available. Historical cash transactions remain intact.
- Request/invoice events send branded email with leases, stable idempotency keys,
  preference/suppression handling and durable retries through existing maintenance.
- Counter/accepted-offer email links open the proper offer or purchase-request page.
- Purchase screens explain the usual 24–48-hour review and subsequent invoice link.
- Duplicate invoice intents are constrained in PostgreSQL; terminal unpaid requests
  close the intent so a new request can be created.

## Deployment order

Apply the timestamped migrations through Lovable before deploying dependent edge
functions and publishing the frontend. The standard-path migration
`20261012190000_offer_security_and_reservations.sql` incorporates the offer
hardening previously committed under drizzle. Do not replay older drizzle
definitions after this migration, which would overwrite the new functions.

Deploy the changed sale-intent, retired cash-sale, commerce-invoices,
paypal-seller-onboarding, paypal-system-status, send-offer-notification and
expire-stale-offers functions with their shared dependencies. Existing hourly
offer maintenance now also expires unpaid invoices and retries commerce emails.

The invoice request/payment rollout flags remain explicit. Request activation
still requires the legal-review record specified in the purchase addendum.
Do not mark payments enabled: `paypal-create-order` deliberately rejects
invoice-required sales until the capture/reconciliation/release lifecycle is
finished. Publishing this branch alone does not make the full invoice payment
journey operational.

## Verification and remaining limits

The GitHub workflow runs real PostgreSQL with independent sessions to test
simultaneous duplicate submissions and conflicting acceptances, not just a
sequential simulation. It also checks role permissions, consent, minimum amount,
counteroffer acceptance/decline, expiry, immutable agreement, reservations and
email leasing. Isolated invoice DB, fee/consent, Square regression and UI-build
checks also run.

Rollback-only tests used the real production schema and synthetic buyer, seller
and outsider identities through Lovable, including SET ROLE authenticated.
No test identities, transactions, messages or migrations were retained. These
are SQL authorization tests, not a deployed browser end-to-end test.

The production database was still serving the older offer RPCs when inspected.
Deployment and buyer/seller browser verification remain outstanding. No real
PayPal charge, capture or payout was made.

Live seller onboarding is blocked upstream by PayPal HTTP 403 NOT_AUTHORIZED
for Partner Referrals; latest inspected debug ID `5dcd4aad6e325`. Code now
identifies the platform authorization problem instead of returning generic 400.
See `paypal-onboarding-live-authorization.md` and `invoice-live-readiness.md`.
