# Referral Program — Phase 1 Hardening Plan

The referral system already has: public landing, dashboard, terms page, `/r/[code]` handler, code generation trigger, cookie + localStorage capture, code fields in signup/booking/purchase, all 9 referral tables, admin ledger page, and edge functions for tracking, applying, redeeming, payout batch, and admin actions.

This plan adds the missing **beta guardrails** without touching any unrelated flow (signup, listing, checkout, marketing, feedback).

---

## 1. Admin feature flags

Add two global flags to `referral_program_config` (or a new `app_feature_flags` row):
- `referral_program_enabled` (default **true** — system already live, but gated UI-side)
- `referral_auto_payout_enabled` (default **false**)

Surface in `ReferralAdmin.tsx` as two toggles at the top.

Behavior when `referral_program_enabled = false`:
- `/referral` → waitlist / coming-soon panel
- `/referral/dashboard` → "Program temporarily unavailable" state
- `/r/[code]` → click is still logged to `referral_clicks`, but `redeem-referral` and `referral-apply-code` short-circuit (no new `referrals` rows)

## 2. Manual code beats cookie

In `redeem-referral` and the booking/checkout apply paths:
- Accept both `manual_code` and `cookie_code` in the request
- If both present and different → use manual, store cookie in `referrals.attribution_source` as JSON `{ manual, cookie }`
- If only cookie → use cookie
- Audit log entry on every attribution decision

## 3. Status flow + pending_review

Extend allowed statuses on `referrals.status`:
`clicked → signed_up → transaction_started → pending_review → qualified → approved → on_hold → paid → voided`

Update `referral-record-event` so that when a qualifying transaction lands, status moves to **`pending_review`** (not directly `qualified`). Admin moves it to `qualified` → `approved` manually unless auto-flag is on.

Every transition continues to go through `log_referral_status_change` (already exists) — verify all code paths use it.

## 4. Stripe Connect: required for payout, not for sharing

Confirmed already correct in `ReferralDashboard` (sharing works without Connect). Add a clear "Connect payouts to receive earnings" banner with non-blocking CTA. Block only the **Withdraw** / payout action when `stripe_onboarding_complete = false`.

## 5. Auto-payout gating

In `referral-payout-batch`:
- First read `referral_auto_payout_enabled`. If `false`, exit early with `{ ok: true, skipped: "auto_payout_disabled" }`.
- Continue to skip referrals with any `referral_fraud_flags` row (already partially handled — verify).

## 6. Terms acceptance logging

`referral_terms_acceptance` table exists. Wire up:
- On `/referral/terms` "I accept" CTA → insert row `{user_id, version, accepted_at, ip, user_agent}` via new edge function `referral-accept-terms`
- Block code generation/sharing UI until accepted (check on dashboard load)

## 7. Tax & payout language

Update `/referral`, `/referral/dashboard`, `/referral/terms` copy:
- Replace "earn $X" → "may earn up to $X"
- Add: "Rewards may be taxable. Vendibook may require a W-9 before payout for U.S. residents earning $600+ per year."
- Add prohibited-activity policy block (spam, paid traffic, bots, link farms, self-referrals, etc.)

## 8. Admin panel — expand actions

`ReferralAdmin.tsx` + `referral-admin-action` already supports `qualify`, `void`, `suspend_referrer`, `update_program`. Add:
- `approve` (pending_review → approved)
- `reject` (→ voided with reason)
- `place_on_hold` (sets `on_hold_until`)
- `mark_paid_manual` (status → paid, no Stripe transfer, note required)
- `add_note` (log-only entry)
- CSV export button (client-side from already-fetched ledger)

Each action writes to `referral_status_log` with `changed_by_source = 'admin'`.

## 9. Isolation guarantees

No changes to:
- `handle_new_user` trigger (other than already-present code generation)
- marketing cron / templates / fallback logic
- listing wizard, checkout, booking, Stripe webhook
- feedback emails

All new logic lives in:
- `supabase/functions/referral-*` + new `referral-accept-terms`
- `src/pages/Referral*.tsx`, `src/components/referrals/*`
- one migration for flags + status enum widening

---

## Technical Details

**Migration:**
```sql
-- Add feature flags (rows in referral_program_config or new singleton table)
INSERT INTO public.referral_program_config (program_type, is_active, reward_amount, ...)
  VALUES ('_flags', true, 0, ...) -- or new app_feature_flags table

-- Widen allowed statuses (no enum — text column today, just validation in code)
-- Add columns: cookie_attribution_code text, manual_attribution_code text on referrals
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS cookie_attribution_code text,
  ADD COLUMN IF NOT EXISTS manual_attribution_code text,
  ADD COLUMN IF NOT EXISTS pending_review_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid;
```

I'll use a dedicated `app_feature_flags` table (key/bool/updated_by) so flags are not entangled with program config rows.

**Files touched (~12):**
- 1 migration
- 4 edge functions edited: `redeem-referral`, `referral-apply-code`, `referral-payout-batch`, `referral-admin-action`, `referral-record-event`
- 1 new edge function: `referral-accept-terms`
- 4 pages: `ReferralLanding`, `ReferralDashboard`, `ReferralTerms`, `ReferralAdmin`
- 1 hook update: `useReferral.ts` (terms-accepted query, flag query)

**No changes** to: AuthContext, listing wizard, checkout, booking flow, Stripe webhook, marketing functions, feedback functions.
