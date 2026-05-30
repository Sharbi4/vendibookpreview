# Referral Program — Wiring Plan (Audit-Based)

## Audit summary (what already exists — DO NOT rebuild)

**Database (all present):** `referrals`, `referral_codes`, `referral_clicks`, `referral_status_log`, `referral_fraud_flags`, `referral_payouts`, `referral_program_config`, `referral_terms_acceptance`, `referral_w9_records`, `admin_action_idempotency`, plus `app_feature_flags` (`referral_program_enabled=true`, `referral_auto_payout_enabled=false`) and config rows for supply/$150, purchase/$500, rental/$50 with correct hold days and caps.

**Edge functions (all present):** `redeem-referral`, `referral-track-click`, `referral-apply-code`, `referral-record-event`, `referral-admin-action` (with idempotency), `referral-payout-batch`, `referral-accept-terms`, `send-referral-emails`.

**Frontend (all present):** `/r/:code` (RHandler), `/referral`, `/referral/dashboard`, `/referral/terms`, `/referral/admin`, `ReferralCapture` mounted globally, `ReferralCodeField` already wired into `BookingCheckout` and `SaleCheckout` (passed to Stripe metadata), code generation trigger `generate_referral_code_for_user`, `log_referral_status_change` RPC with idempotency, `has_role`/admin gating, terms acceptance flow.

## What is actually missing (the wiring gap)

Despite all the surface area existing, **no production flow ever calls `referral-record-event`**. `rg "referral" supabase/functions/stripe-webhook supabase/functions/complete-ended-bookings` returns zero matches. That is the central break: referrals can be attributed at signup and codes captured at checkout, but they never advance past `signed_up` because no upstream system fires the qualifying event.

Secondary gaps: supply program has no publish-time / first-transaction trigger; rental has no booking-completion trigger; fraud auto-flags (self/seller/IP) are not evaluated on event; admin "void" path doesn't auto-fire on Stripe dispute/refund webhook events.

## Changes to make

### 1. Stripe webhook → fire qualifying events (purchase + rental)
Edit `supabase/functions/stripe-webhook/index.ts`:
- On `checkout.session.completed` / `payment_intent.succeeded` where `payment_status==='paid'`, read `metadata.referral_code` (already set by `BookingCheckout`/`SaleCheckout`) and the resulting `sale_transactions` / `booking_requests` row.
- If sale: call `referral-record-event` with `program_type:'purchase'`, `referred_user_id=buyer_id`, `transaction_id`, `transaction_value`. Pre-filter: skip when `seller_id===referrer` (handled both here and inside the function).
- If rental booking paid: store `referral_code` on `booking_requests.referral_code` (new nullable column) — do NOT fire `rental` event yet; rental qualifies on completion, not on payment.
- On `charge.dispute.created` / `charge.refunded` for a referred transaction: invoke `referral-admin-action` (`place_on_hold` or `void` with reason) via service role.

### 2. Rental qualification on completion
Edit `supabase/functions/complete-ended-bookings/index.ts`:
- For each booking transitioned to `completed`, if it has `referral_code` or its `shopper_id` has a `signed_up` referral row, and booking duration ≥ 2h and value ≥ $150 and not cancelled/disputed, call `referral-record-event` with `program_type:'rental'`. Function already enforces config (`min_transaction_value=150`, `hold_days=2` mapped to 48h post-completion → `pending_review`).

### 3. Supply program wiring
- **Migration:** add `referrals.listing_id uuid`, `referrals.listing_published_at timestamptz`, `referrals.supply_first_txn_at timestamptz`; add `booking_requests.referral_code text` and `sale_transactions.referral_code text` (nullable) so webhook can read them when Stripe metadata is lost.
- **Listing publish hook:** in `PublishWizard` publish path (or via a small DB trigger on `listings.status -> 'published'`), if owner has a `signed_up` referral with no `program_type`, set `program_type='supply'`, `listing_id`, `listing_published_at=now()`, status `transaction_started`, log it. Prefer trigger to keep client paths clean.
- **First-transaction watcher:** in `stripe-webhook` after a successful sale/booking, if the listing's host has an attached supply referral with `listing_published_at` set and `supply_first_txn_at IS NULL`:
  - if `now() - listing_published_at >= 30 days` AND `now() - listing_published_at <= 90 days` AND listing still `published`/in good standing → call `referral-record-event` with `program_type:'supply'`.
  - else if past 90d → mark `expired` via admin-action.
- **Daily cron:** add a small scheduled function (or extend an existing one) `referral-supply-expiry` to flip stale supply referrals to `expired` after the 90-day window.

### 4. Auto-fraud evaluation
Extend `referral-record-event` (single place) to insert `referral_fraud_flags` rows when:
- referrer == seller_id / host_id of the qualifying entity,
- buyer email/phone matches referrer email/phone,
- referrer's `profiles.referral_suspended=true` (skip event entirely),
- > N clicks from same hashed_ip in <1h (lookup `referral_clicks`),
- signup-to-qualify gap < threshold for purchase.
Flags block auto-payout (already enforced) but do not block status progression — admin reviews.

### 5. Payout safety
Confirm `referral-payout-batch` already checks `referral_auto_payout_enabled` flag, Stripe Connect status, fraud flags, hold window, threshold. Add the explicit short-circuit on `app_feature_flags.referral_auto_payout_enabled=false` at the top of the function if not already present, and ensure it returns "manual-only" without firing transfers.

### 6. Notifications
Hook into `send-referral-emails` (already present) from the three flip points: `pending_review`, `qualified/approved`, `paid`, `voided/on_hold`. Use the existing email queue (`enqueue_email`), not raw Resend. Add admin notifications for `qualified` + `fraud_flag_detected` via the existing `notifications` table.

### 7. Dashboard real-data check
`/referral/dashboard` already uses `useReferralCode` + `useMyReferrals`. Verify the aggregations on the page (total earned / pending / paid) read from `referrals.reward_amount` filtered by status — patch any remaining mock values. No redesign.

## Technical notes

- All admin writes already go through `referral-admin-action` with idempotency + unique `(referral_id, action_type, idempotency_key)` on `referral_status_log` and `referral_fraud_flags`. Webhook-driven auto-actions must pass a deterministic idempotency key (e.g. `stripe-event-${event.id}`) so Stripe retries don't double-log.
- New columns require a single migration with `GRANT` re-issued only if needed (existing tables already have grants).
- Keep `referral_program_enabled=false` short-circuits at the top of `redeem-referral`, `referral-track-click`, `referral-apply-code`, `referral-record-event` (already in place — verify).
- Do not touch unrelated cron jobs, marketing emails, Zendesk paths (Zendesk is removed), or notification trigger functions beyond adding referral events.

## Out of scope
UI redesign, new tables for already-covered concepts, Stripe Connect onboarding rewrite, W9 collection UX, CSV export beyond what `ReferralAdmin` already renders.
