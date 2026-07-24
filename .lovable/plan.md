# Phase 2 — Vendibook Protected Sale

Optional paid protection layer on top of the existing free sale flow. Buyer and seller opt in; Vendibook holds funds until the handoff is confirmed.

## Fee model
- **Vendibook Protection fee:** 4.9% of sale price
- **Minimum:** $499 · **Maximum:** $3,000
- **Deposit:** 10% of sale price (min $500), non-refundable if buyer walks after agreement signed
- Buyer pays deposit at agreement; balance + fee at scheduled handoff window

## What ships in Phase 2

### 1. Data model (one migration)
- `protected_sales` — one row per opt-in sale (linked to `sale_transactions.id`)
  - status: `initiated → id_verified → agreement_signed → deposit_paid → balance_authorized → handoff_scheduled → funds_released → completed` (+ `disputed`, `cancelled`, `refunded`)
  - buyer/seller identity_verified_at, agreement_snapshot (jsonb), agreement_signed_at, protection_fee_cents, deposit_cents, balance_cents, handoff_mode (`pickup`|`delivery`), handoff_location, handoff_scheduled_at, handoff_confirmed_by_buyer_at, handoff_confirmed_by_seller_at, funds_released_at, terms_id (FK to transaction_terms)
- `protected_sale_events` — audit log (actor, event, payload, ip)
- RLS: buyer + seller can read their own row; only edge functions (service_role) can write status transitions. Admins can read all.
- Trigger: block status regressions; require both identity_verified_at fields before agreement can be signed.

### 2. Edge functions
- `protected-sale-initiate` — creates row from an existing sale_transaction, computes fee/deposit, returns Stripe Identity session URLs for whichever party isn't verified
- `protected-sale-sign-agreement` — writes immutable agreement snapshot + terms_id (reuses `useTermsGate` pattern), records signer IP
- `protected-sale-deposit-checkout` — Stripe Checkout for deposit
- `protected-sale-balance-authorize` — SetupIntent + off-session PaymentIntent authorization for the balance + protection fee at handoff-1d
- `protected-sale-confirm-handoff` — requires confirmation from both parties (or admin override) then triggers capture + payout scheduling (25-day sale window already in place)
- `protected-sale-webhook` — Stripe events for identity.verified, checkout.session.completed, payment_intent.succeeded; idempotent via existing `edge_action_idempotency`

### 3. Frontend
- New route `/sale/:transactionId/protection`
- Stepper (reuses Phase-1 `JourneyProgress`): Verify Identity → Sign Agreement → Pay Deposit → Schedule Handoff → Confirm Handoff → Funds Released
- Components under `src/components/protected-sale/`:
  - `ProtectionOptInCard` (mounts inside `SaleCheckout.tsx` transaction-details step, above submit)
  - `IdentityVerifyStep`, `AgreementStep` (renders `FinalReviewSheet` + protection-specific clauses), `DepositCheckoutStep`, `HandoffStep` (pickup vs delivery — reuses fulfillment fee logic), `ConfirmHandoffStep`, `FundsReleasedStep`
  - `ProtectedSaleStatusBadge` for dashboard rows
- Dashboard: new "Protected Sales" tab (buyer + seller views) with status + next action CTA
- Listing detail: small "Vendibook Protection available" trust chip on eligible sale listings ($499+)

### 4. Emails (via existing `send-transactional-email`, all `idempotencyKey`-required)
- `protected-sale-initiated`, `protected-sale-id-verified`, `protected-sale-agreement-signed`, `protected-sale-deposit-received`, `protected-sale-handoff-reminder` (T-24h), `protected-sale-funds-released`, `protected-sale-cancelled`

### 5. Dispute integration
- Dispute flow already resolves `terms_id`; extend `AgreedTermsPanel` to also render protected-sale agreement snapshot when present
- Admin dispute view shows both handoff-confirmation timestamps + IPs

### 6. Tests
- `src/lib/protectedSale/fees.test.ts` — 4.9% w/ $499 floor and $3k ceiling, deposit math
- `supabase/tests/protected_sale_status_trigger.sql` — regression + verification-required invariants
- `supabase/functions/protected-sale-confirm-handoff/dual_confirmation.test.ts`
- Playwright `tests/e2e/protected_sale_happy_path.py` (signed-in, uses Stripe test mode)

## Out of scope for Phase 2 (queued)
- Buyer Services intake (Phase 3)
- Host Pro subscriptions (Phase 4)
- Permit Path monetization (Phase 5)

## Technical notes
- Reuses: `useTermsGate`, `transaction_terms`, `edge_action_idempotency`, `send-transactional-email` (with critical-template idempotency), `JourneyProgress`, `PrimaryActionBar`, existing Stripe Identity session helper, fulfillment/delivery fee calculator
- New Stripe secret needed: none — existing `STRIPE_SECRET_KEY` covers Identity + Checkout + PaymentIntents
- Webhook: extends existing `stripe-webhook` handler rather than a new endpoint, to keep one signing secret
- Existing free sale flow untouched; opt-in only

Approve and I'll ship Phase 2 in this order: migration → fee lib + tests → edge functions → UI stepper → dashboard integration → emails → e2e.
