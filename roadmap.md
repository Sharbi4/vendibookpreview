# Roadmap

## PayPal Complete Payments — Connected Path certification

- [x] Step 1 — Foundation: BN code on all REST calls + JS SDK, PayPal request
      diagnostics (debug id, latency, environment, reference), multiparty
      feature flag defaulting OFF, SDK still loaded from PayPal's CDN, token
      caching preserved.
- [x] Step 2 — Seller onboarding: Partner Referral create, seller status lookup,
      `seller_paypal_accounts` + history table (disconnects archive, never
      delete), Payments & Payouts connect / ready / action-required /
      disconnected UI with PayPal's exact copy. Sandbox-first: runs in
      PAYPAL_ONBOARDING_ENV, token cache split per environment. Gated OFF
      behind PAYPAL_SELLER_ONBOARDING_ENABLED until you flip it on (needs the
      live PAYPAL_PARTNER_MERCHANT_ID before live rollout).
- [x] Step 2.5 — Activate sandbox onboarding (set
      PAYPAL_SELLER_ONBOARDING_ENABLED=true, PAYPAL_ONBOARDING_ENV=sandbox) and
      run a seller end-to-end against PayPal sandbox.
- [~] Step 3 — Multiparty routing behind the flag: DONE — payee +
      payment_instruction/platform_fees on sale and rental orders only (never
      Vendibook's own products), Vendibook fee = gross - seller proceeds,
      routing recorded on payment_records.metadata.multiparty, routed payables
      recorded as already paid so the manual queue can't double-pay, refunds
      issued with PayPal-Auth-Assertion on the seller's behalf. Inert while
      PAYPAL_MULTIPARTY_ENABLED is off. Still open: per-kind line items,
      shipping matrix and address validation.
- [~] Step 4 — Merchant onboarding webhooks (MERCHANT.ONBOARDING.COMPLETED,
      MERCHANT.PARTNER-CONSENT.REVOKED) handled + persisted. Still open:
      refunds with partner-fee reversal, thank-you
      payment source.
- [x] Step 5 — Sandbox QA matrix + certification evidence package.
- [x] Step 6 — Live cohort rollout; retire manual payouts per onboarded seller.

## Other open items

- [x] SEO Tier 2 wave (city FAQ differentiation, PricePilot links on buy pages) —
      awaiting go-ahead.
- [x] Add the marketing tag to the new-listings digest sends so opens/clicks are
      tracked — awaiting decision.
- [x] Rebuild the public homepage around real Featured, sale, and rental inventory with premium mobile merchandising.
- [x] Rewrite homepage, public payments, and seller money-center copy for premium conversion and demote Purchase Protection limitations to FAQ/footer disclosures.

## V2 unified logged-in workspace — parallel preview

- [x] Add `/onboarding-v2` with a single non-exclusive intent choice and preserved deep links.
- [x] Add unified `/dashboard-v2` shell and responsive navigation without altering legacy routes.
- [x] Add V2 Home, Listings, Activity, Messages, Payments, and Account using real existing data.
- [x] Verify desktop/mobile layouts and confirm legacy dashboard, checkout, booking, and payment routing remain untouched.

## Workspace premium visual refinement (live /dashboard)
- [x] Fix PayPal wordmark render on /dashboard/payments
- [x] Connect PayPal CTA: PayPal-branded, not Vendibook orange
- [x] Needs-your-attention row rhythm
- [x] Recompose legacy payments panels (heading scale, shared chrome)
- [x] Listing action contrast (View/Edit/Promote/Share)
- [x] /welcome document title
- [x] Editorial Home, richer Listings, grouped Activity timeline, Account hero
- [x] Shell/search/motion/color refinement; checkout+booking visual match
- [x] Re-test all routes desktop + 390px

## Booking flow in the workspace dashboard
- [x] `/dashboard/bookings/new[/:listingId]` — start a rental booking inside the shell
- [x] `/dashboard/bookings/:bookingId` — booking status/confirmation inside the shell
- [x] Activity: booking amounts, payment state, working detail links
- [x] Payments: rental bookings section (renter paid + host received)

## PayPal certification videos (sandbox)
- [ ] Seller linking flow recording — needs backend switched to sandbox
- [ ] Buyer purchase recording — needs a sandbox PERSONAL (buyer) test account
- [ ] Checkout method recording (PayPal button)
- [ ] Declined payment recording — needs negative testing enabled on sandbox seller
- [ ] Seller tools recording (transactions, refunds, unlink)

## Manual delayed-release workflow
- [x] Add server-owned sale release conditions and 10-day deadline fields.
- [x] Refresh release readiness from real saved walkthrough video and completed two-party SignNow agreement.
- [x] Enforce release conditions in admin payout actions and add full PayPal refund action.
- [x] Surface countdown and outstanding conditions on buyer/seller order pages.
- [x] Surface conditions and refund controls in admin payout queue.
- [x] Keep deadline handling manual in the selected workflow; overdue records stay in admin review until refunded.
- [x] Deploy and run focused tests.

## Disputes Phase 1 (complete)
- [x] Protection eligibility mapping + honest checkout disclosure (sale + rental)
- [x] Vendibook case flow: open, thread, admin request info, admin resolve
- [x] Disbursement freeze + paused 10-day clock (DB trigger + edge gate, fails closed)
- [x] Admin cases/frozen-orders view at /admin/disputes
- [x] Case emails (both parties + admin) and in-app notifications
- [x] /legal/payments-terms section 7A, version 2026-09-18c
- [x] Daily deadline reminders to buyer + seller and admin digest (scheduled job, 8:10am Phoenix)
- [x] Admin cancel-and-refund tool (refund must succeed before anything is cancelled)
- [ ] Phase 2: PayPal dispute webhook ingestion + automated evidence package
## Checkout UI continuation
- [x] Make disabled sale/rental checkout actions clearly legible.
- [x] Replace duplicate numbered guidance with one adaptive storyline.
- [x] Add and link the public Meetup & Inspection Guide.
- [x] Reconcile checkout, success, and order-detail payment/fulfillment copy.
- [x] Verify desktop, mobile, guide links, typecheck, and build.


## SignNow transaction-document system
- [x] Versioned template registry (7 kinds) + multi-page PDF engine
- [x] Generation layer with frozen-snapshot prefill, idempotency, immutability
- [x] Lifecycle gating, amendment flow, neutral emails/webhook copy
- [x] DocumentsCard status/version surfaces, tests
- [ ] UI triggers for handoff / check-in / check-out documents (endpoint ready: signnow-ensure-document)
- [ ] Counsel review of all template text before production reliance

## Bounded checkout wizard refactor
- [x] Bound desktop sale/rental wizards with internal active-step scrolling.
- [x] Remove duplicate review navigation, pickup copy, and Payment financing.
- [x] Move rental verification into Details while preserving server gates.
- [x] Add wizard-aware shell and independently scrolling desktop rail.
- [x] Validate real sale/rental routes, mobile layout, typecheck, build, and checkout tests.
