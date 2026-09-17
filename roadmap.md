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
