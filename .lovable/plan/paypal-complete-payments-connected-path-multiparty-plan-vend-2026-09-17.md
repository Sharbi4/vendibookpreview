# PayPal Complete Payments — Connected Path multiparty plan (Vendibook LC)

Revised against the supplied PayPal Complete Payments Integration Guide. Audit and
plan only — no production code changes. CONFIRMED = read in this project;
INFERRED = reasoned.

The prior architecture question ("can we keep gross-capture + manual payout?") is
removed. The approved design is: sellers onboard through PayPal, sellers receive
transaction funds, Vendibook earns commission as a Partner Fee.

## 1. What exists today (CONFIRMED)

- `supabase/functions/_shared/paypal.ts` — the only REST layer. Token cached
  until expiry, retries, `PayPal-Request-Id` idempotency, `safeLog()` redaction,
  webhook signature verification.
- `paypal-create-order` (7 kinds: sale, booking, product, freight, notary,
  concierge, protected_sale_deposit), `paypal-capture-order`,
  `paypal-authorize-order`, `paypal-settle-authorization`, `paypal-refund`
  (Vendibook-admin only), `paypal-webhook`, `paypal-config`,
  `paypal-subscription-create/activate/cancel`.
- Browser: `src/lib/paypalClient.ts` loads the official SDK at runtime;
  `PayPalPaymentPanel.tsx` mounts Buttons, Card Fields, Pay Later Messages.
- Records: `payment_records`, `payment_ledger_entries`, `payment_audit_log`,
  `seller_payables`, `payout_preferences` (seller enters a payout *email*; admin
  pays manually).
- Gaps confirmed absent everywhere: BN code / `PayPal-Partner-Attribution-Id`,
  `data-partner-attribution-id`, Partner Referrals, seller status lookup,
  `purchase_units[].payee`, `platform_fees`, `PayPal-Auth-Assertion`,
  `items[]`, App Switch. `shipping_preference: NO_SHIPPING` is hardcoded on both
  order builders for all kinds.

## 2. Which flows go multiparty vs stay first-party (item C)

Route to the onboarded **seller** (payee = seller merchant id, Vendibook takes a
Partner Fee equal to today's commission):

| Flow | Intent today | Multiparty notes |
|---|---|---|
| Vehicle / equipment sale | AUTHORIZE until seller confirms, then capture | Fee applied at capture. Physical goods: real shipping address, `PHYSICAL_GOODS` |
| Rental booking | Capture or authorize per Instant-Book vs Request-to-Book | Fee = 12.9% host commission; renter fee stays a separate line |
| Security deposit (rental) | Charge + hold + refund | Stays inside the booking order; deposit excluded from seller proceeds — keep it out of the fee base |

Stay **first-party to Vendibook** (no payee, no partner fee — these are
Vendibook's own products):

- Featured Listing boost (`boost-featured-30`, $49)
- Verified Seller / identity verification ($19.99, authorize-then-capture)
- Memberships / subscriptions (PayPal Billing Plans)
- Notary
- Concierge / listing services and other Vendibook add-ons
- PermitPath Plus and any tool entitlement

**Freight / delivery** — decide per case: Vendibook-arranged freight (the current
quote-and-invoice flow) is Vendibook revenue and stays first-party. Seller-arranged
delivery priced into the sale should ride inside the seller's order. Recommendation:
keep freight first-party in Phase 1.

**Protected sale deposit** — Vendibook holds it as part of a Vendibook-mediated
process. Recommendation: keep first-party in Phase 1, revisit after certification.

Business rules preserved unchanged: 12.9% / 10.9% Pro commission, $500 Pro cap,
free cash sales, authorize-vs-capture timing, deposit handling.

## 3. Seller PayPal connection data model (item D)

New table `seller_paypal_accounts`:

- `user_id` (unique, FK auth.users), `tracking_id` (our stable referral id),
  `merchant_id` (PayPal payer id), `paypal_email`,
  `primary_email_confirmed` bool, `payments_receivable` bool,
  `oauth_scopes` jsonb, `consent_granted` bool,
  `products` jsonb (PPCP product/capability status),
  `onboarding_status` enum: `not_started | referral_created | returned |
  ready | action_required | disconnected`,
  `referral_url`, `last_status_check_at`, `status_payload` jsonb (raw,
  PII-trimmed), timestamps.

RLS: owner reads own row; only service_role writes. GRANT SELECT to
`authenticated`, ALL to `service_role`. Derived helper
`seller_paypal_ready(user_id)` used by checkout gating.

Lifecycle: not_started → referral_created (link generated) → returned (seller
came back) → poll status → ready or action_required; nightly re-check;
`MERCHANT.PARTNER-CONSENT.REVOKED` → disconnected. Disconnect clears
`merchant_id`/email/scopes so a different PayPal account can be linked.

## 4. Seller UX in Payments & Payouts (item E)

Extend `src/components/account/PaymentsPayoutsSection.tsx`:

- **Not connected** — "Connect PayPal to get paid" + what it enables; single
  primary button opening PayPal's signup link (mini-browser, `displayMode=minibrowser`),
  return URL back to this section.
- **Returned / checking** — brief "Finishing up with PayPal…" with polling.
- **Ready** — green state showing the PayPal email and merchant ID, granted
  permissions, "Disconnect" (confirmation dialog warning that listings stop
  accepting PayPal until reconnected).
- **Action required** — the exact remediation: confirm your PayPal email, or
  PayPal needs more information before you can receive payments, with a
  "Re-check status" button and a link into PayPal.
- **Disconnected** — reconnect button, prior account forgotten.

Checkout gating: for seller-payee kinds (sale, rental), if the seller is not
ready, hide/disable PayPal checkout on that listing with an honest buyer message
("This seller isn't accepting online payments yet — message them"), and notify
the seller. Vendibook's own products (boost, membership, IDV) are never gated.

## 5. Server-side changes (item F)

- `_shared/paypal.ts`: inject `PayPal-Partner-Attribution-Id: VENDIBOOK_SP_PPCP`
  on every REST call; add `PayPal-Auth-Assertion` builder (base64 header +
  `{iss: partner_client_id, payer_id: merchant_id}`); add `payee`,
  `payment_instruction.platform_fees`, `items[]`, and per-kind
  `shipping_preference` / shipping address support; add order PATCH.
- New `paypal-partner-referral` (creates referral with
  `partner_config_override.return_url`, our `tracking_id`, PPCP products and
  requested scopes) and `paypal-seller-status` (merchant-integrations lookup,
  writes readiness fields; also runnable as a scheduled re-check).
- `paypal-create-order`: per-kind branch — seller kinds add payee + platform fee
  + items + shipping; Vendibook kinds keep today's behavior. Fee base excludes
  deposits and taxes.
- Authorize flow: fee applied at capture (`platform_fees` on capture) for
  AUTHORIZE orders; capture flow keeps fee at creation.
- `paypal-refund`: refund with auth assertion for seller orders, reverse the
  platform fee proportionally, keep admin-only entry plus a seller-initiated path;
  handle insufficient-balance with a specific message.
- `paypal-config`: expose the BN code so the SDK tag can set
  `data-partner-attribution-id`; `paypalClient.ts` sets it.
- `paypal-webhook`: add `MERCHANT.ONBOARDING.COMPLETED`,
  `MERCHANT.PARTNER-CONSENT.REVOKED`, and merchant product/capability updates.
- Logging: persist PayPal `debug_id`, endpoint, status, latency and correlation
  ids per call (no card data, no full payer PII), 90-day retention.

Phasing of optional capabilities: **required for certification** — onboarding,
readiness gating, BN code, auth assertion, payee + partner fee, items, shipping,
refunds, thank-you payment source. **Phaseable** — App Switch, Fastlane, Apple
Pay / Google Pay, merchant-level vaulting, Advanced Card Fields beyond what we
already render.

## 6. Security (item G)

Client secrets and partner credentials stay server-side; only the publishable
client id and BN code reach the browser. Auth assertions are generated
server-side per request. Idempotency keys stay deterministic per record. New
table is RLS-protected, service-role-write only. `safeLog()` extended to strip
payer email/phone and card fields while keeping debug ids.

## 7. Staged rollout (item H)

- **Phase 0** — BN code everywhere, `items[]`, per-kind shipping mapping,
  PayPal debug-id logging. Zero behavior change, works in live immediately.
- **Phase 1 (sandbox only, flagged)** — connection table + partner referral +
  status lookup + seller status UI + disconnect/reconnect. No checkout change.
- **Phase 2 (sandbox)** — payee + partner fee on sale and rental orders behind
  `paypal_multiparty_enabled` flag, per-seller opt-in; existing single-merchant
  path remains the default so live checkout never breaks.
- **Phase 3** — refunds with fee reversal, webhooks, thank-you payment source.
- **Phase 4** — sandbox QA matrix, evidence capture, PayPal certification.
- **Phase 5** — flip live per seller cohort; retire manual payouts once a seller
  is multiparty (see below).

## 8. Certification evidence checklist (item I)

Plaintext request/response with headers for: OAuth token, partner referral
create, seller status lookup, create order (each in-scope kind), PATCH, capture,
authorize + capture-later with fee, refund with fee reversal, webhook verify.
Recordings: successful seller onboarding; not-ready seller onboarding (email
unconfirmed / payments not receivable); successful buyer payment per in-scope
method (PayPal, Venmo, Pay Later, card); declined payment per method.
Screenshots: connect button, PayPal redirect, Ready state with email + merchant
id, Action Required state, disconnect confirmation, reconnect, checkout showing
PayPal parity, cancel/return, thank-you with payment source named (Venmo shown as
Venmo). Plus questionnaire answers.

## 9. Phase 1 ready-to-build scope (item J)

New: migration for `seller_paypal_accounts` (+ RLS, GRANTs, ready helper);
`supabase/functions/paypal-partner-referral/index.ts`;
`supabase/functions/paypal-seller-status/index.ts`.
Changed: `_shared/paypal.ts` (BN code header, auth assertion helper),
`paypal-config/index.ts` (expose BN code), `src/lib/paypalClient.ts`
(`data-partner-attribution-id`),
`src/components/account/PaymentsPayoutsSection.tsx` (+ new
`PayPalConnectCard.tsx`), a `useSellerPayPalAccount` hook.
Secrets needed (names to confirm, values not invented): partner client id /
secret if different from current, partner merchant id, BN code
`VENDIBOOK_SP_PPCP`, sandbox webhook id.

## 10. Manual payouts and migration concerns

Manual admin payouts can be retired **per seller** once that seller is multiparty
and certified — funds then land in their own PayPal account and
`seller_payables` becomes a reconciliation record rather than a to-do. Keep the
manual path indefinitely for: cash / pay-in-person sales, freight and other
Vendibook-invoiced items, and any seller who never onboards.

Backward compatibility: existing `payment_records` and `seller_payables` rows
stay first-party and must keep resolving in admin screens; do not backfill payee
or fee fields onto historical rows. Existing listings from non-onboarded sellers
must not silently stop selling — gate only when the flag is on for that seller,
and email sellers ahead of any cohort flip. `payout_preferences` stays as the
fallback record even after a PayPal connection exists.

---
Approve to start Phase 0 + Phase 1 only (no live checkout behavior change).
