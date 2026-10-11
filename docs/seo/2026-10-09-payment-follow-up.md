# Dashboard and payment follow-up — October 9, 2026

## Delivered to the requested branch

All task fixes are pushed to `fix/paypal-webhook-config`; the local isolated checkout is named `codex/dashboard-account-fixes`. The original checkout's unrelated uncommitted work was preserved. The [manifest](2026-10-09-change-manifest.json) lists the selected task commits and every changed file.

### Dashboard and account

- Corrected links to transaction records, buyer/host conversations and receipts; preserved dashboard filters in URLs.
- Separated marketplace transactions from plans, boosts and services.
- Restored payout preferences with a dedicated Account page, provider-connection links and clearer manual/direct-settlement explanations.
- Scoped earnings/payables to the signed-in seller; added query failures/retries and visible/focus refresh.
- Distinguished expected earnings from money sent; removed “paid” language for unpaid rental bookings.
- Corrected rental date-only display, expired walkthrough status, and read-only behavior for completed/cancelled booking documents.
- Improved narrow-screen account navigation, scheduling controls, notification menus, calendar readability and payout-form contrast.
- Updated PayPal runtime configuration caching so old session-storage sandbox configuration does not override current live configuration.

### Completion guards and money-status accuracy

`97e2320e8`: manual payout approval and retry now check rental completion/payment, disputes and holds; sale approval requires a saved walkthrough plus signed-agreement evidence. Failed evidence lookups block money actions. Retry follows the same case checks. Added a database migration covering review/approval/processing/completion transitions, including SQL NULL readiness values.

`468d39874`: rental completion job queues proceeds using the linked booking payment, rather than seller + listing. It reports “ready for review,” never “sent,” and no longer sets the payout-completed bookkeeping flag without a transfer.

`340c386f3` and `c70e732a5`: deposit status changes only after a confirmed complete refund for the expected amount. Missing references, failed/pending/manual outcomes and failed dispute reads do not become “refunded.” Non-PayPal deposits require original-provider review, rather than attempting a PayPal refund.

No fee rates were changed. No live charge, refund or transfer was executed.

## What is not yet enforced across all live payments

**Current connected seller checkout routes can settle directly to sellers at capture.** A manual payout queue cannot delay money already sent directly by PayPal or Square. Those recorded settlements must not be converted into unpaid payables or paid twice.

The earlier question about moving all future seller proceeds to a completion-controlled settlement model remains unanswered. The user's desired timing is clear; provider collection/disbursement support and the live checkout routing must be resolved before changing who receives funds. Current behavior is:
- Sales: PayPal.
- Rentals: Square, per repository instructions.
- Vendibook-collected proceeds: manual review queue.
- Connected seller payments: provider settlement path.

Rental completion currently includes the existing scheduled transition after the paid booking's end timestamp. Review eligibility runs after 24 hours and checks disputes/holds. If “successful completion” must require a separate return inspection or explicit customer confirmation, that is an additional business rule; it is not represented as implemented.

The new migration protects manual status transitions. It intentionally does not rewrite historical provider-settled records inserted as completed. It is not a universal delayed-disbursement implementation.

## Production deployment limitations

The public production PayPal config reported enabled/live, CAPTURE intent, USD and an available client ID. That confirms configuration only—not successful capture, webhook delivery or final settlement.

The connected Supabase tool account targets `knhncgvothakiirxicqh`; the app's production project is `nbrehbwfsmedbelzntqs`. Production function access was denied. No production migration or function deployment was performed. Do not deploy these changes to the wrong project.

Before release:
1. Apply `20261010010000_manual_payout_completion_guard.sql` to the intended project and exercise its denial/allow cases in a non-production database first.
2. Deploy `admin-payout-action` and `complete-ended-bookings` with their shared helpers.
3. Confirm provider payout/collection capabilities and future checkout routing for completion-only settlement.
4. Verify actual signed-agreement and saved-walkthrough events update the sale payable.
5. Verify one controlled rental and sale across checkout, provider completion, webhook replay, dashboard record and release eligibility.
6. Verify disputes, refunds, holds and failed lookups block payout and retry; verify no second payout is possible.
7. Reconcile any historical records that were previously marked sent/refunded inaccurately against provider evidence before correcting them. No automatic historical rewrite was performed.

Review the provider's [production guidance](https://developer.paypal.com/api/rest/production/) and [webhook documentation](https://developer.paypal.com/api/rest/webhooks/) during live validation.

## Files for the completion/refund follow-up

- supabase/functions/admin-payout-action/index.ts
- supabase/functions/complete-ended-bookings/index.ts
- supabase/functions/_shared/payoutReleasePolicy.ts
- supabase/functions/_shared/rentalPayoutEligibility.ts
- supabase/functions/_shared/confirmedRefund.ts
- supabase/migrations/20261010010000_manual_payout_completion_guard.sql
- src/test/payments/payoutReleasePolicy.test.ts
- src/test/payments/rentalPayoutEligibility.test.ts
- src/test/payments/confirmedRefund.test.ts

The full earlier dashboard file inventory is in the manifest.

## Verification and limits

- 20 payout-rule cases, 4 booking-specific queue cases, 7 refund-outcome cases passed.
- Earlier 48 payment/dashboard tests passed (capture outcomes, rejection gates, routed orders, runtime configuration, seller payables, transactions and earnings).
- Application type checking passed.
- Built preview verified signed-in payout preferences and form at 390 × 844, with readable labels/fields.
- Database trigger execution and production end-to-end settlement remain unverified.
- Preview stopped and temporary browser viewport reset; original production admin tab retained.

