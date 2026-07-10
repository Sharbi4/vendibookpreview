# Lightweight Transaction Details — Full Rollout

Ship the "quiet clarity" transaction-details experience across listing pages, checkout, booking, wizard, dashboard, and emails, using the already-built primitives as the foundation. No new visual system — extend the existing Satin Lux tokens.

## Scope decisions (from your answers)
- Ship all three slices in one push.
- Acknowledgment is recorded server-side on `transaction_terms` (`acknowledged_at`, `acknowledged_ip`, `acknowledged_user_agent`).
- Copy lives in `transactionTerms.ts` / template components (no admin copy table).

## What already exists (reuse, don't rebuild)
- `src/lib/transactionTerms.ts` — `buildTerms`, `renderTermsEmailBlock`
- `src/components/transaction/TransactionSummary.tsx` — "Good to Know" block
- `src/components/transaction/TransactionDetailsAccordion.tsx` — expanded sections
- `src/components/transaction/PriceDetailsModal.tsx` — "See Price Details"
- `src/components/transaction/FinalReviewSheet.tsx` — final review + checkbox
- `public.transaction_terms` table + RLS
- `create-checkout` writes snapshot for Stripe rentals/sales
- `booking-confirmation.tsx` email renders `TermsBlock`

## What's missing / broken (this push closes it)

### 1. Wiring (read-side)
- Listing detail (`ListingDetailPage` / booking widget / sale widget): render `TransactionSummary` under the price block with 2–4 filtered bullets and the correct labeled link ("View Rental Details" / "View Purchase Details" / "View Booking Details" / "See Price Details" / "View Cancellation Policy").
- Rent checkout / Buy checkout / Commercial-kitchen booking: mount `FinalReviewSheet` as the last step before Stripe redirect / cash confirm, with the acknowledgment checkbox.
- Dashboard order/booking detail: render `TransactionDetailsAccordion` from the stored snapshot so post-purchase view matches pre-purchase view.
- All copy driven by `buildTerms(listing, selection)` — no hard-coded strings in the widgets.

### 2. Relevance filter (spec §4, §17)
- Extend `buildTerms` so each section is emitted only when its underlying data is present: no deposit → no deposit line; no delivery → no delivery line; no mileage → no mileage line; no insurance requirement → no insurance line; PIP sale → no Stripe wording; Instant Book → suppress "host approval" wording, and vice versa.
- Add unit-test cases per config in `transactionTerms.test.ts` (rental base only, rental + deposit, rental + auth hold, rental + insurance, rental + mileage, rental + late return, approval, instant book, PIP sale, online sale, commercial kitchen, vendor lot).

### 3. Pay-in-Person snapshot (write-side, closes prior audit fail)
- New edge function `create-cash-sale`: validates ownership rule, runs `buildTerms`, inserts `transaction_terms` row, then inserts `sale_transactions` row with `terms_id`, `payment_method='pay_in_person'`, `platform_fee=0`, `seller_payout=amount`. Single transaction, idempotent on `(listing_id, buyer_email, created_at bucket)`.
- Update `src/pages/SaleCheckout.tsx` cash branch to call the new function instead of inserting directly.
- Update `send-sale-notification` to fetch the linked `transaction_terms` and pass a `terms` prop to both cash email templates; add `TermsBlock` render.
- Assert in a test that no `create-checkout` network call fires on the cash path.

### 4. Acknowledgment ledger (spec §21)
- Migration adds `acknowledged_at timestamptz`, `acknowledged_ip inet`, `acknowledged_user_agent text` to `public.transaction_terms`.
- New edge function `acknowledge-terms` (JWT-validated): body `{ terms_id }`, writes the three fields for a row the caller owns; returns 200. Called by `FinalReviewSheet` submit before proceeding.
- RLS: owner can update only these three fields via a `SECURITY DEFINER` function; direct UPDATE on the columns stays denied.

### 5. Host-wizard structured fields (spec §20)
- Audit `listings` columns against the required set. Add only what's missing (deposit_amount, auth_hold_amount, mileage_included, mileage_overage_rate_cents, late_return_fee_cents, insurance_required, cleaning_expectation, fuel_expectation, cancellation_policy_key, required_documents jsonb, access_hours, etc. — only columns not already present).
- Update the listing wizard fee-editor to force `{ name, amount|calc, category: mandatory|optional|conditional|refundable, short_description }`. Blank name or missing category disables Save.
- Wizard microcopy: "Add only charges the renter may actually be responsible for."

### 6. Copy pass (spec §2, §7, §10, §11, §12, §17, §19)
- Centralize the exact strings in `transactionTerms.ts` constants: heading variants ("Good to Know" / "Before You Buy" / "Booking Details"), payment-timing phrases, PIP wording, approval vs Instant Book phrasing, deposit vs auth-hold phrasing, insurance/permit wording, Vendibook role paragraph.
- Remove any duplicate strings from checkout/widget files.

### 7. Design/accessibility (spec §3, §22, §23, §24)
- `TransactionSummary` text at `text-sm` (14px) `text-muted-foreground`, hairline top border, no accent color, no icon-only info without `aria-label`.
- Links use existing text-link style, not buttons.
- Mobile: `TransactionDetailsAccordion` opens in a bottom sheet (Radix Dialog with `data-state` breakpoint) so main CTA stays visible.
- All accordion triggers keyboard-operable; `aria-expanded` bound; `aria-live="polite"` on expanded state.

### 8. Tests
- Extend `src/components/transaction/transaction-views.test.tsx` with every config in spec §26 (rental base, +service fee, +required host fee, +optional delivery, +deposit, +auth hold, +insurance, +docs, +cleaning, +mileage, +late return, approval, instant book, PIP sale, online sale, commercial kitchen, vendor lot).
- New Playwright suite `tests/e2e/transaction_details_flow.py`:
  - Listing page shows 2–4 bullets, expandable details, price details modal.
  - Rent flow: FinalReviewSheet shows checkbox; submit disabled until checked; on submit, `acknowledge-terms` fires exactly once, then Stripe.
  - Buy-online flow: same.
  - Buy-cash flow: no `/create-checkout` call, exactly one `/create-cash-sale` call, `transaction_terms` row exists linked to the sale.
  - Dashboard for each of the above renders the same accordion from the snapshot after refresh.
  - Mobile viewport: CTA stays above fold; details open in bottom sheet.

## Technical details

### Migration
```sql
ALTER TABLE public.transaction_terms
  ADD COLUMN acknowledged_at timestamptz,
  ADD COLUMN acknowledged_ip inet,
  ADD COLUMN acknowledged_user_agent text;

CREATE OR REPLACE FUNCTION public.acknowledge_transaction_terms(
  _terms_id uuid, _ip inet, _ua text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.transaction_terms
     SET acknowledged_at = COALESCE(acknowledged_at, now()),
         acknowledged_ip = COALESCE(acknowledged_ip, _ip),
         acknowledged_user_agent = COALESCE(acknowledged_user_agent, _ua)
   WHERE id = _terms_id
     AND (renter_id = auth.uid() OR buyer_id = auth.uid());
END $$;
GRANT EXECUTE ON FUNCTION public.acknowledge_transaction_terms(uuid,inet,text) TO authenticated;
```
Plus a listing-column audit migration for any missing structured fields.

### File touch list (approx)
- edit: `src/pages/ListingDetailPage.tsx`, `src/components/listing-detail/BookingWidget.tsx`, `src/components/listing-detail/SaleWidget.tsx`, `src/pages/SaleCheckout.tsx`, `src/pages/RentCheckout.tsx`, `src/pages/BookingCheckout.tsx`, dashboard order/booking detail pages, `src/lib/transactionTerms.ts`, `src/lib/transactionTerms.test.ts`, `src/components/transaction/*.tsx`, `src/components/transaction/transaction-views.test.tsx`, `supabase/functions/send-sale-notification/index.ts`, cash email templates, listing-wizard fee editor.
- create: `supabase/functions/create-cash-sale/index.ts`, `supabase/functions/acknowledge-terms/index.ts`, `tests/e2e/transaction_details_flow.py`, one schema migration.

### Also fix (auto-flagged security)
- Storage policy `booking-documents` cross-host leak: tighten the host-view policy to match on the specific `booking_id` folder tied to a booking where `br.host_id = auth.uid()`, matching the sibling policy already scoped correctly. Included in the same migration.

## Non-goals
- No admin copy CMS.
- No new visual system — same tokens.
- No changes to fee math or Stripe amounts.
- No changes to the ownership rule, PIP commission-free rule, or payout timing.
- No new signup/marketing consent flows (out of scope of this ticket — audit noted separately).

## Verification before finishing
1. `tsgo` clean.
2. `bunx vitest run` — all new/updated unit + integration tests pass.
3. Playwright `transaction_details_flow.py` passes on desktop + mobile viewports.
4. DB check: at least one cash order in the test seed has a linked `transaction_terms` row; at least one card order has both `stripe_payment_intent_id` and `terms_id`.
5. Screenshot pass on the live listing page confirms primary CTA is still visually dominant.
