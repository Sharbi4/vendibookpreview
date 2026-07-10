## Goal

Every payment or booking submit routes through `FinalReviewSheet` so a versioned `record_user_consent` row (and an `acknowledged_at` stamp on `transaction_terms`) is written *before* the money-moving edge function runs. UX pattern is **intercept**: existing Submit buttons open the sheet, sheet's `onConfirm` runs the original handler.

## New backend piece

**Edge function `create-transaction-terms-draft`** (auth required, verify_jwt = false + validate in code).

Input: `{ listing_id, mode: 'rent'|'sale', selection: {...}, buyer?: {...} }`.

Steps:
1. Validate caller is authenticated (`getUser` from access token).
2. Load listing, run the same `buildTerms(...)` resolver as the client / downstream edge functions (import `_shared/transactionTerms.ts` — will need to create shared copy of `src/lib/transactionTerms.ts` under `supabase/functions/_shared/`).
3. Insert one row into `public.transaction_terms` with `status = 'draft'`, `sale_transaction_id = null`, `booking_request_id = null`, `snapshot`, `terms_version`, `transaction_mode`, `payment_method`, pricing cents columns.
4. Return `{ terms_id, snapshot, terms_version }`.

Add a `status` column if missing:
```sql
ALTER TABLE public.transaction_terms
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft','active','superseded'));
CREATE INDEX IF NOT EXISTS idx_transaction_terms_status ON public.transaction_terms(status);
```

## Modify existing money-moving edge functions

Each accepts an optional `terms_id` on the request body; when present, **reuse** that row (update `status → 'active'`, set `sale_transaction_id` / `booking_request_id` after the sale/booking row exists, and re-run `buildTerms` server-side and assert `snapshot` matches — if it drifts, the request is rejected as tampered). When absent, keep current behavior (insert fresh row) for backward compat.

- `supabase/functions/create-cash-sale/index.ts` — replace the current "insert sale, insert terms, backlink" block with the reuse path when `terms_id` present.
- `supabase/functions/create-checkout/index.ts` — same, guard the terms insertion.
- `supabase/functions/create-booking-hold/index.ts` — same for the rent request-to-book branch.

## UI: intercept the submit button in 5 flows

Shared helper `src/hooks/useTermsGate.ts`:
```ts
useTermsGate({ listing, mode, selection, buyer }) →
  { open, setOpen, terms, termsId, prepare(), submitting }
```
`prepare()` calls the draft edge function, stores `terms`+`termsId`, opens the sheet. `submitting` covers both the prepare call and the sheet's own state.

Wire into each flow:

| File | Current submit | Change |
|---|---|---|
| `src/pages/SaleCheckout.tsx` | `handlePurchase` (line 351) | Rename to `runPurchase`. New `handleSubmit` calls `gate.prepare()`; on sheet `onConfirm`, invoke `runPurchase` (cash + card branches unchanged). |
| `src/components/purchase-wizard/PurchaseStepReview.tsx` | props `onSubmit` | No change — parent passes new interceptor. |
| `src/pages/BookingCheckout.tsx` | `handleSubmit` (line 265) | Rename to `runSubmit`. New `handleSubmit` opens the sheet; `onConfirm → runSubmit`. |
| `src/components/listing-detail/BookingForm.tsx` | `handleSubmit` (line 252) | Same intercept pattern. |
| `src/components/listing-detail/BookingWizard.tsx` | `handleSubmit` (line 252) | Same intercept pattern. |
| `src/components/search/QuickBookingModal.tsx` | `handleSubmit` (line 164) | Same intercept pattern. |

Mount `<FinalReviewSheet open={gate.open} onOpenChange={gate.setOpen} terms={gate.terms} termsId={gate.termsId} onConfirm={runSubmit} submitting={submitting} />` at the bottom of each page/component.

The inline "I agree" checkbox stays as a pre-gate — the user still can't click Submit without it — so the sheet is a final confirmation, not the only agree surface.

## Consent write order (contract enforced by the sheet)

1. User clicks Submit → checkbox check → `gate.prepare()` → draft terms row created.
2. Sheet opens, user re-agrees, clicks confirm.
3. `FinalReviewSheet.handleConfirm` calls `record_user_consent` RPC.
4. On success, it best-effort calls `acknowledge-terms` edge function with `termsId`.
5. On success, `onConfirm()` runs → `create-checkout` / `create-cash-sale` / `create-booking-hold` fires with `terms_id` in the body → server flips status draft→active.

If any step 3–4 fails, no payment/booking submit happens.

## Tests

- `supabase/functions/create-transaction-terms-draft/*_test.ts` — unauthenticated 401, snapshot shape, status='draft'.
- `src/hooks/useTermsGate.test.ts` — draft-call → sheet open flow; error handling closes gracefully.
- Extend `tests/e2e/cash_sale_terms_snapshot.py` to assert the sheet opens, consent RPC lands (via network log), and the terms row exists with `status='active'` after submit.

## Scope check

New: 1 edge function, 1 hook, 1 migration.
Modified: 3 edge functions, 5 UI flow files, 1 shared terms module copy for Deno.
Total ~11 files.
