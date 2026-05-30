# Vendibook Referral Program — Build Plan

This expands the **existing** referral system (already has `referral_codes`, `referrals` tables, `ReferralPanel`, `ReferralCapture`, `redeem-referral` edge function, and a `VB-XXXX` code generator trigger) into the full three-program engine you spec'd.

## Scope check — what already exists

- ✅ `referral_codes` table with `code`, `give/get_amount`, totals
- ✅ `referrals` table with `referrer_id`, `referred_user_id`, `code`, `status`, `qualifying_event`
- ✅ Auto-code generation on profile insert (`generate_referral_code_for_user`)
- ✅ `redeem-referral` edge function + `ReferralCapture` cookie+URL handler
- ✅ `lookup_referral_code` RPC, `useReferral` hook, basic share UI in `ReferralPanel`

What's missing: program-typed rewards (Supply/Purchase/Rental), payouts, fraud detection, admin tooling, terms ledger, W-9, full lifecycle logging, notifications, landing/terms/admin pages.

---

## 1. Database (one migration)

**Modify existing**
- `referral_codes`: add `program_type` is NOT needed (one code per user, three link destinations); keep as-is.
- `referrals`: add `program_type enum('supply','purchase','rental')`, `reward_amount numeric`, `transaction_id uuid`, `qualified_at`, `payout_date`, `void_reason text`, `on_hold_until timestamptz`, expand `status` enum to include `clicked|signed_up|qualified|on_hold|paid|voided`.

**New tables**
- `referral_clicks` — click_id, code, ts, hashed_ip, user_agent, device_type, source_header, country, region, program_type, converted_to_signup, signup_user_id, cookie_set
- `referral_status_log` — referral_id, old/new status, changed_by (system|admin|user uuid), ts, note
- `referral_payouts` — referral_id, referrer_id, amount_gross, stripe_fee, amount_net, stripe_transfer_id, status, attempted_at, completed_at, failure_reason
- `referral_fraud_flags` — referral_id, flag_type, detected_at, resolved_by, resolution_note, severity
- `referral_terms_acceptance` — user_id, terms_version, accepted_at, ip_address, user_agent
- `referral_w9_records` — user_id, collected_at, taxpayer_name, tax_id_last4, storage_path
- `referral_program_config` — program_type PK, reward_amount, min_transaction_value, hold_days, monthly_cap, is_active (admin-tunable kill switch + amounts)

**Profile additions** — `referral_ytd_earnings numeric default 0`, `referral_w9_collected boolean default false`, `referral_suspended boolean default false`, `referral_terms_version_accepted text`.

All tables: GRANTs (authenticated select-own; service_role all; anon none), RLS scoped to `auth.uid()` or `is_admin()`. Status transitions written via SECURITY DEFINER RPCs that auto-write `referral_status_log`.

**Triggers**
- After insert on `booking_requests` (status=paid+completed) → resolve rental referral, gate on min $150.
- After insert on `sale_transactions` (status=paid) → create purchase referral row in `on_hold` for 14 days, gate on $3,000 min, host≠referrer.
- After listing publish + 30 days alive + first transaction within 90d → resolve supply referral.
- Status change → notification insert.

## 2. Edge functions

- `referral-track-click` — called by `/r/[code]` handler; logs `referral_clicks`, sets cookie, redirects to program-specific URL.
- `referral-attribute-signup` — extend `redeem-referral` to write `program_type` based on signup path/cookie source.
- `referral-apply-code` — validate code at checkout/booking; returns `{ok, referrer_first_name}` for green-check UX; called from purchase + rental flows.
- `referral-qualify` — internal RPC-callable; promotes `signed_up → qualified` after program-specific conditions.
- `referral-stripe-onboard` — reuses existing `create-stripe-connect` (already in repo); add `purpose=referral_payout` flag.
- `referral-payout-batch` — pg_cron Monday 09:00 UTC; finds `qualified` past hold window, ≥$50 accumulated per user, W-9 present if YTD≥$500; creates Stripe transfers, writes `referral_payouts`.
- `referral-stripe-webhook` — handles `transfer.paid/failed`, updates payout + referral status, fires notification.
- `referral-fraud-scan` — pg_cron hourly; runs the 7 detection rules, writes `referral_fraud_flags`, auto-moves matching referrals to `on_hold`.
- `referral-admin-action` — admin-only approve/void/suspend/adjust-reward, all logged.
- `referral-send-notification` — switch on event, calls existing `send-transactional-email`.

## 3. Frontend pages

- `/referral` (public landing) — dark hero (#0F0F0F + #FF5124), Barlow Condensed display, count-up `$150/$500/$50` numbers (motion), 3 program cards, how-it-works, trust bar, FAQ accordion, final CTA. Mobile-first.
- `/referral/dashboard` — terms-gate modal on first visit (writes `referral_terms_acceptance`); earnings summary (Total / Pending / Available); program-tab switcher; link generator with destination dropdown (Supply→`/list-your-space`, Purchase→`/buy`, Rental→`/rent`); share row (copy, SMS, email, WhatsApp, X, Web Share, QR PNG download via `qrcode` lib) with FTC disclosure baked into copy; activity table; Stripe Connect banner reusing `useStripeConnect`; payout history; W-9 prompt when YTD≥$500.
- `/referral/terms` — sticky anchor sidebar, version + last-updated, full verbatim text from spec. Re-prompt re-acceptance if version bumps.
- `/referral/admin` — role-gated by `is_admin()`. Ledger w/ filters, per-referral timeline (reads `referral_status_log`), approve/void/suspend, adjustable rewards (writes `referral_program_config`), global kill switch toggle, fraud queue, bulk payout button, ROI + cohort dashboards, CSV export, 1099 generator filtered by tax year.
- `/referral/admin/test` — admin-only end-to-end runner that exercises every step in Stripe test mode and asserts DB state.
- `/r/:code` route in `App.tsx` → calls `referral-track-click` then `<Navigate>` to destination.

## 4. Checkout integrations

- `BookingCheckout.tsx` — add visible "Referral code" field that auto-fills from cookie/localStorage with "Referral code applied ✓"; calls `referral-apply-code`; persists code on `booking_requests.referral_code`.
- Purchase checkout (`PurchaseStep*`) — visible required-but-blank field above submit; same validation + green confirmation; persists to `sale_transactions.referral_code`.
- Listing wizard signup — pre-fill from cookie; "Were you referred?" toggle if no cookie.

## 5. Tracking & attribution rules

- 30-day cookie (existing `ReferralCapture` pattern) + localStorage fallback.
- Manual code at checkout always overrides cookie; conflicts logged.
- Existing-user clicks: no attribution, log only.
- First-cookie-wins when no manual code.

## 6. Compliance & money safety

- Country gate on Stripe Connect onboarding (eligibility check before account create).
- W-9 collection flow ($500 buffer below IRS $600) gates further payouts.
- Min payout threshold $50; weekly batch; Stripe fee logged per payout.
- FTC line auto-appended in social share copy.
- Terms versioning with forced re-acceptance.

## 7. Verification before sign-off

- Vitest: code attribution priority (manual > cookie), min-value gates, hold-window math.
- Edge function tests: `referral-apply-code` validation, `referral-payout-batch` selection logic.
- Manual run of `/referral/admin/test` in Stripe test mode.

---

## Technical notes

- Reuse `useStripeConnect`, `create-stripe-connect`, `create-stripe-dashboard-link` already in repo for onboarding/dashboard links.
- Reuse `send-transactional-email` + existing template registry — add new templates: `referral-clicked`, `referral-signup`, `referral-qualified`, `referral-paid`, `referral-voided`, `referral-w9-required`, `referral-fraud-hold`.
- QR generation client-side with `qrcode` (add dep).
- Animations via existing `framer-motion`; count-up via `useMotionValue` + `animate`.
- Charts on admin ROI use existing recharts.
- All status mutations go through SECURITY DEFINER RPCs so `referral_status_log` can't be bypassed.

## Out of scope (flagging now)

- Actual W-9 PDF generation/e-sign — collect data + store; PDF/IRS filing handled manually by ops year-end.
- International tax forms (W-8BEN) — block non-US referrers from program v1, show "coming soon".
- Real-time fraud ML — rule-based only for v1.

---

This is large. Confirm and I'll execute in this order: **(1) migration → (2) edge functions + cron → (3) `/r/:code` + checkout integrations → (4) dashboard → (5) landing → (6) terms → (7) admin → (8) tests**. Want me to ship all in one go, or stage it (e.g. 1–4 first, then 5–8)?