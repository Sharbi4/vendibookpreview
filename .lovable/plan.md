# Pay-in-Person Purchase Flow — Scoped Audit & Repair Plan

Before writing any code, I want to align on scope. The request describes a 22-section rebuild, but two facts change the picture:

- The Cash / Pay-in-Person flow already exists end-to-end: `create-sale-transaction`, `SaleCheckout.tsx`, `PurchaseStepReview.tsx`, `confirm-sale`, `send-sale-notification` with four dedicated cash templates (`cash-purchase-request-{buyer,seller}`, `cash-seller-confirmed-buyer`, `cash-buyer-confirmed-seller`), the `pending_cash` status is already in the DB check constraint, and dashboards already surface it.
- Live data shows **1 total** `sale_transactions` row (status `pending_cash`, no confirmations yet, ~5 days old). There is no backlog of "broken" cash orders and no failing Stripe cash rows. So the "likely an issue" premise is not visible in the data.

Given that, I recommend a targeted audit + repairs rather than a full rebuild, and I want your sign-off on scope before I touch anything.

## What I will do (in this order)

### 1. Read-only architecture audit (no code changes)
Enumerate the actual cash path and produce a short written root-cause report covering:
- `create-sale-transaction` + `SaleCheckout` cash branch (insert shape, status, nullability of Stripe fields).
- `confirm-sale` state machine for cash (buyer marked paid → seller confirmed → item received → completed).
- RLS on `sale_transactions` (buyer/seller read, party-scoped updates, admin oversight).
- Dashboard queries — grep for any inner joins that require `payment_intent_id` / `checkout_session_id`.
- Notification triggers for each cash transition, and confirm no template says "card charged" / "escrow" / "payout released" on a cash order.
- Review eligibility — confirm `reviews` gating uses `status = 'completed'` and does not require a Stripe id.
- Listing reservation behavior on cash creation and cancellation.
- The single existing `pending_cash` row — verify it is reachable from both dashboards and has valid next actions.

If the audit finds no defect, I will report that and stop. I will not invent problems to fix.

### 2. Targeted repairs only for defects the audit surfaces
Likely candidates (only fixed if actually broken):
- Dashboard/notification queries that inner-join on Stripe columns and drop cash rows.
- Any status-transition branch in `confirm-sale` that assumes a `payment_intent_id`.
- Missing idempotency on buyer/seller confirmation buttons.
- Any email template that uses card/escrow wording on the cash path.
- RLS gaps where a non-party could update someone else's transaction.

Each repair will be a minimal patch — no schema rewrites, no status renames, no rebuild.

### 3. Automated end-to-end test (proof)
Add a Deno test alongside the existing `create-listing-draft/e2e_test.ts` that, using the existing `TEST_USER_EMAIL` (seller) and `TEST_RENTER_EMAIL` (buyer):
1. Publishes a cash-only sale listing.
2. Creates a `pending_cash` sale_transactions row as the buyer.
3. Advances buyer → seller confirmations via `confirm-sale`.
4. Asserts status progression, both-party visibility, and completion.
5. Cleans up.
Skips gracefully if `TEST_RENTER_EMAIL` is not set (same pattern as the rental booking test).

### 4. Report
Root cause (or "no defect found"), exact files changed, the test's pass output, and a note that no Stripe/online-payment code was touched.

## Explicitly out of scope for this pass
- No new tables, statuses, or migrations unless a real defect requires it.
- No mass email refactor.
- No repair of the one existing `pending_cash` row (it is not stuck — no confirmations yet).
- No cross-browser manual QA — automated Deno e2e is the proof.
- No touching Stripe/online payment code paths.

## Reply with one of
- **"go"** — I run the audit and only patch actual defects, then add the e2e test.
- **"audit only"** — I produce the audit report and stop before any code changes.
- **"full rebuild"** — override the above and execute all 22 sections as written (much larger, higher-risk change; I would want to break it into several turns).
