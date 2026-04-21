

## Make Referrals + SMS Actually Work

Three real bugs are blocking the flows you tested. Here's what I'll fix.

### 1. SMS verification is missing entirely (root cause of "no confirmation text")

**The bug:** When you entered your phone in the opt-in prompt, it saved `verified = false`. The `send-sms` function refuses to send to any subscription where `verified` is false — so no confirmation SMS, and no future alerts will ever reach you.

**Fix:**
- New edge function **`send-sms-verification`** — generates a 6-digit OTP, stores it (hashed, 10-min expiry) in a new `sms_verification_codes` table, and sends it via Twilio: *"Your Vendibook code is 123456. Reply STOP to opt out."*
- New edge function **`verify-sms-otp`** — accepts the code, marks `sms_subscriptions.verified = true` on success, increments attempt counter, locks after 5 fails.
- Rewrite **`SmsOptInPrompt.tsx`** as a 2-step flow:
  1. Phone + TCPA consent → triggers `send-sms-verification`
  2. 6-digit code input → triggers `verify-sms-otp` → success toast
- Same 2-step flow exposed in `CommsPreferencesPanel` so users can re-verify if they change number.

### 2. Referral redemption counter bug

**The bug:** `redeem-referral/index.ts` line 76-79 has a broken nested-await that double-reads `total_referred` and can write `NaN` or `1` regardless of true count. Functionally referrals still get inserted, but the dashboard stat is wrong.

**Fix:**
- Add SQL function `increment_referral_counter(p_owner_id uuid)` that does `UPDATE referral_codes SET total_referred = total_referred + 1` atomically.
- Replace the broken block in `redeem-referral` with a single `admin.rpc("increment_referral_counter", ...)` call.

### 3. Share links — verify they work + add per-user attribution

**Status:** Codes ARE individualized (DB trigger generates one per user on signup, backfilled for existing users). `buildReferralUrl` correctly stamps `?ref={your_code}&utm_source=referral`. `<ReferralCapture />` is mounted in `App.tsx` and stores the code in localStorage, then auto-redeems on login.

**What I'll add:**
- A small **"Test your link"** button in `ReferralPanel` that opens your own link in a new tab so you can visually confirm `?ref=YOURCODE` is appended.
- Make the `share()` SMS/Email/FB/X buttons log to `share_events` (already wired) AND show a toast confirming which channel fired.
- Verify the FB sharer + X intent URLs render correctly (they do — standard endpoints).

### 4. End-to-end test I'll run after the build

1. Open referral panel → confirm code shows + matches `referral_codes` row in DB.
2. Click "Test your link" → confirm URL has correct `?ref=`.
3. Open SMS opt-in → enter phone → confirm Twilio API call fires + verification row created.
4. Enter the 6-digit code → confirm `verified = true`.
5. Trigger a test SMS via `send-sms` → confirm it now sends (no more `skipped_not_subscribed`).

### Files

**New:**
- `supabase/functions/send-sms-verification/index.ts`
- `supabase/functions/verify-sms-otp/index.ts`
- Migration: `sms_verification_codes` table + `increment_referral_counter()` RPC

**Edited:**
- `supabase/functions/redeem-referral/index.ts` (fix counter)
- `src/components/comms/SmsOptInPrompt.tsx` (2-step flow)
- `src/components/comms/CommsPreferencesPanel.tsx` (re-verify section)
- `src/components/referrals/ReferralPanel.tsx` (Test link button + toast on share)
- `supabase/config.toml` (register new functions)

### Notes
- Twilio connector is already linked (`TWILIO_API_KEY` + `TWILIO_FROM_NUMBER` are set), so no new secrets needed.
- OTP table will have RLS: users can only read/insert their own codes; service role does the verification check.
- No changes to existing referral DB schema — codes stay individualized as they are.

