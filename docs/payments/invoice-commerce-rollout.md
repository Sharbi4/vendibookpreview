# Equipment invoices and BuyerMatch rollout

## Audit — 2026-10-11

Baseline: `main` at `ab740659c`. Production schema was inspected through the Vendibook Marketplace Lovable project only.

Existing systems to reuse:

- `sale_transactions`, `create-sale-intent`, accepted `offers`, sale fulfillment, SignNow agreements, `confirm-sale`, disputes, refunds and order detail/receipts.
- PayPal provider abstraction, Connected Path readiness checks, payment records, signature-verified webhooks and idempotent capture finalization.
- Google checkout address checks, server-priced delivery/freight and Campus Partner credits.
- `notifications`, read states, transactional email send log and shared branded Resend templates.
- `host_subscriptions`, monetization products/plans, existing Pro entitlement resolver and Featured Boost credits.

Production findings:

- No purchase-request/invoice/BuyerMatch tables currently exist.
- Connected orders currently specify **INSTANT** disbursement. Existing payout copy must not be treated as evidence of delayed PayPal custody.
- The tax engine currently uses statewide estimates only. It does not resolve local jurisdictions, facilitator obligations or exemptions. It cannot authorize the requested production invoice tax calculation unchanged.
- Live `vendibook_pro` plan: PayPal, USD 7,900 cents monthly. Preserve billing IDs, amount, interval, subscriptions and purchased entitlements.
- Rental Pro math and sale Pro math share a helper. Separate future-sale pricing without changing rental discounts or historical fee snapshots.

## Implementation contracts

1. Requests and invoices extend the existing sale transaction. A request alone does not reserve stock. Seller approval must atomically reserve a listing and issue at most one invoice for accepted terms.
2. New regular online equipment sales use 870 basis points for every seller. Commission base is the agreed equipment amount only; tax, separately priced delivery/freight and Vendibook-funded credits are excluded. Existing locked terms remain unchanged. Build Studio stays independently configured at 6.5%; cash/direct eligible sales remain free.
3. Invoices freeze itemized integer-cent totals, seller identity, terms, destination and tax determination. No native PayPal invoice path that loses partner fees. Reuse multiparty orders attached to the internal invoice.
4. New invoice payments require a connected merchant with approved partner-fee and delayed-disbursement capabilities. No fallback to first-party capture for this flow. Existing rentals and historic orders retain their own behavior.
5. Capture records payment success only after server verification. Delayed capture is not seller payout completion. Early release requires handoff/agreement gates and no blocking dispute. Provider auto-release at 28 days requires reconciliation and an exception queue; it is not an indefinite escrow promise.
6. Request acknowledgment is versioned, unchecked by default, server validated, linked to the buyer/listing/seller/terms and immutable. Counsel review is required before production activation.
7. BuyerMatch starts pending activation. Muse is initially an admin-reviewed structured import, not an invented API. Seller reports contain approved non-contact activity only; no automatic outbound prospect messages.
8. New money movement remains disabled until real sandbox validation and rollout gates pass. Git publication does not mean live activation or completed end-to-end testing.

## Delivery sequence

- Audit and architecture (this document).
- Fee policy, purchase state and invoice/reservation foundation.
- Existing checkout/PayPal integration and deadline handling.
- Buyer/seller invoice workspace, acknowledgment, pending badges and notifications.
- Shared invoice email/interface presentation and sitewide fee references.
- BuyerMatch records/imports, entitlements, dashboard and Pro presentation.
- Focused tests, build, schema/security checks and sandbox provider validation.

## Production release gates

- Counsel-approved purchase acknowledgment and linked policy versions.
- Destination-level approved tax provider or documented reviewed tax determinations, including responsible party/exemption evidence.
- PayPal sandbox seller onboarding, delayed capture, fee accounting, release, refunds, disputes and retry evidence, followed by confirmation of enabled live partner capabilities.
- Muse report format and approved operational fulfillment workflow. Campaign metrics must remain empty/pending until real reviewed activity exists.

References: [PayPal delayed disbursement](https://developer.paypal.com/platforms/checkout/delayed-disbursement), [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).
