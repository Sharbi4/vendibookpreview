# Transaction-Details System — End-to-End Build

Goal: one authoritative record of what the guest is agreeing to (item, dates, fees, deposits, policies), rendered as four consistent views, snapshotted at checkout, and echoed by Stripe metadata + receipt emails so it can be audited later.

## Scope (in)
- New DB snapshot table `transaction_terms` written on checkout.
- Shared pricing/terms resolver used by all four views.
- Four UI surfaces powered by the resolver:
  1. **Summary card** (booking widget / sale widget)
  2. **Expanded details** (accordion under summary)
  3. **Price details modal** (line-item breakdown)
  4. **Final review sheet** (last screen before Stripe / Pay-in-Person)
- Wire snapshot write into: `create-payment` (sale card), `create-rental-payment` (rental card), and the pay-in-person path.
- Include a compact HTML terms block in the existing booking-confirmation / sale-receipt emails.
- Playwright E2E: sale card, rental instant, rental request, pay-in-person — verifying that the *same* numbers/policies appear in all four views and in the confirmation email.

## Scope (out)
- No refactor of fee formulas (uses existing `src/lib/commissions.ts`).
- No changes to Stripe webhook or payout timing.
- No admin UI to edit snapshots.
- Dispute / cancellation flows unchanged (they will read the snapshot but their UI is not being rebuilt here).

## Data model
`public.transaction_terms`
- `listing_id`, `booking_id` (nullable), `sale_transaction_id` (nullable), `buyer_id` (nullable — guest), `host_id`
- `snapshot jsonb` — the full resolver output: item, dates/slots, fulfillment, pricing lines, fees, deposit, cancellation policy text, required documents list, accepted policies, currency
- `total_cents`, `subtotal_cents`, `deposit_cents`, `commission_cents`, `renter_fee_cents`
- `terms_version text`, `stripe_session_id text`, `payment_method` (`stripe_card` | `pay_in_person`)
- `created_at`
- RLS: buyer sees own; host sees rows for their listings; service_role full.

## Shared resolver
`src/lib/transactionTerms.ts` — pure function:
```
buildTerms({ listing, selection, promo, buyer }) → TransactionTerms
```
Returns the same object used by every view AND persisted verbatim. This is the single source of truth.

## UI (frontend-only, uses resolver)
- `src/components/transaction/TransactionSummary.tsx`
- `src/components/transaction/TransactionDetailsAccordion.tsx`
- `src/components/transaction/PriceDetailsModal.tsx`
- `src/components/transaction/FinalReviewSheet.tsx`

Each accepts `terms: TransactionTerms` — no independent math. Mounted into:
- `BookingWidget`, `RentalBookingWidget`, `SaleListingMobile`, `SaleStickyActionBar` → summary + "View details" → accordion / price modal.
- Booking/sale checkout flow → `FinalReviewSheet` before invoking edge function.

## Backend wiring
- `create-payment` / `create-rental-payment`: build terms server-side from the same inputs the client sent, write a `transaction_terms` row, attach `terms_id` and `terms_version` to Stripe session `metadata`, return `terms_id`.
- Pay-in-person path: same write, `payment_method='pay_in_person'`, no Stripe call.
- Sale/booking confirmation emails include a compact "What you agreed to" block populated from the snapshot.

## Verification
- Vitest unit tests for `buildTerms` (sale card, sale PIP, rent instant, rent request, promo applied, deposit, freight).
- Playwright E2E per variant on desktop + mobile:
  1. Load listing, open summary → capture totals.
  2. Open price modal → assert same totals + line items.
  3. Proceed to Final Review → assert same totals, policies, dates.
  4. Intercept edge-function call → assert payload matches.
  5. For Stripe flow: intercept `create-payment` response, assert `terms_id` present and DB row matches.
  6. Trigger confirmation email in preview mode → assert HTML contains the same total + cancellation clause.

## Deliverables order
1. Migration for `transaction_terms` + RLS/grants.
2. `src/lib/transactionTerms.ts` + unit tests.
3. Four UI components + integration into existing widgets.
4. Edge-function updates + email template block.
5. Playwright E2E suite.
6. Run vitest + Playwright, fix, report pass/fail with screenshots.

## Technical notes
- Snapshot is immutable — updates create a new row with an incremented `terms_version` linked back via `previous_terms_id`.
- Cancellation-policy text is pulled from listing at snapshot time so later policy edits don't retroactively change what a guest agreed to.
- The resolver returns cents-only integers; UI formats. No floats in the DB.
- No changes to `src/integrations/supabase/client.ts`, `types.ts`, or `.env`.

## Estimate
~15–20 file changes, one migration, one edge-function edit per payment path, ~8 Playwright scenarios. Realistically one focused build session; I will report at the end which scenarios passed and which are still red rather than claiming blanket success.

Approve to proceed, or tell me which slice to cut (e.g. skip pay-in-person, skip email block, skip final-review sheet).
