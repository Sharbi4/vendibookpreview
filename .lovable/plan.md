# P0 Signup + Publish Recovery Plan

## Findings up front (verified before proposing fixes)

1. **Email delivery is NOT the root cause.** Lovable Emails on `notify.vendibook.com` is verified and healthy. Last 7 days: 30 `welcome`, 41 `listing-draft-nudge`, 10 `listing-published`, 10 `stripe-onboarding-nudge`, 51 `generic-notice` all sent successfully. The 1,350 dead-letters are 100% digest emails (`host-daily-digest`, `shopper-daily-digest`, `host-weekly-digest`) — a separate templating bug, not auth. Auth-email sending itself is working.
2. **Signups and publishes are happening, but low.** 19 listings created / 10 published in the last 14 days. So the friction is real but "zero" is directional. The audit still needs to run to confirm each of the 6 publish paths works for a real end-user (not service-role).
3. **Phone field bug confirmed.** `authSchema` marks `phoneNumber` `.optional()` but the input has `required` on it — that WILL silently block submit if the browser rejects an empty required field before Zod runs.
4. **Google OAuth uses managed wrapper** (`lovable.auth.signInWithOAuth`) — that's the correct path on Lovable Cloud, not a bug per se, but I'll verify end-to-end in the preview.
5. **"Escrow" copy is present in ~50 files** — needs a global sweep.

## Part 1 — Reduce signup friction (immediate code fixes)

**`src/components/auth/AuthFormPanel.tsx`**
- Reduce required signup fields to: email, password, full name, terms. Keep the role selector.
- Delete the phone input from the signup form and drop `phoneNumber` from the `authSchema.parse` call. Collect phone later at booking/listing time where it's actually needed.
- Change `emailRedirectTo: '${origin}/'` → `${origin}/auth/callback` (a public route the app already handles) so users don't bounce off protected redirect logic.
- Remove any `required` attribute from optional inputs so the browser doesn't block submit.

**Verify (no code change unless broken):**
- `AuthContext.signUp` creates the profile row via the `handle_new_user` trigger — confirm the trigger still exists and runs for both password + Google signups.
- Redirect allowlist: report what needs to be added to the Cloud auth allowlist (production domain, published `.lovable.app`, preview `id-preview--*.lovable.app`). This is a config action for the owner, not code.

## Part 2 — "Escrow" → "Payment protection" sweep

Global find/replace across the ~50 files listed, preserving legal/agreement wording where "escrow-style" is technically accurate but rewording user-facing copy to "payment protection." Test files that assert on "escrow" get updated too.

## Part 3 — Publish matrix audit (real user, not service role)

Using a real verified test account driven through Playwright against the local preview, exercise all 6 paths and report pass/fail with the exact blocker:

| # | Path | Expected |
|---|---|---|
| a | Sale, card enabled | Requires Stripe Connect gate; publishes after onboarding |
| b | Sale, pay-in-person only | Publishes with NO Stripe account required |
| c | Sale, both | Card path gated by Stripe; cash path always OK |
| d | Rent, card enabled | Gated by Stripe |
| e | Rent, pay-in-person | No Stripe required |
| f | Rent + deposit + cleaning fee | Publishes; fees stored |

For each path verify: draft row created, each wizard step saves, `status='published'` with `published_at` set, exactly ONE listings row (no dupe), and the listing appears in browse/search + detail page.

## Part 4 — Fix the Stripe Connect gate (if it fires on cash-only)

Inspect `useListingForm` publish path + `EditListing`/`CreateListing` submit handlers. The current rule should be "Stripe required only if `payment_methods` includes card." If the gate fires on cash-only listings, remove that branch. Any blocker must produce a toast with a clear message and a link to fix (e.g., "Connect payouts" → Stripe onboarding).

## Part 5 — Wizard upgrade / Pro CTAs

Audit every upgrade CTA inside the listing wizard (Spark write-for-me, price suggestions, Featured Boost at publish, membership nudges, locked tools):

1. Every CTA must invoke `create-checkout` (or the monetization checkout) and open Stripe. No dead clicks.
2. `success_url` returns to `/create-listing?draft=<id>&step=<n>&unlocked=<sku>` so the user lands on the exact step with data intact.
3. `cancel_url` returns to the same step with nothing charged.
4. **Hard rule:** every optional upsell has a visible "Skip / continue free" that always completes publishing. Verify each CTA has one.

## Part 6 — Configuration the owner must change (report only)

I'll report the exact required changes at the end (not code):
- Cloud → Auth: confirm Site URL and add missing redirect URLs to the allowlist.
- Cloud → Auth → Google: confirm managed Google is enabled; if BYOK, verify redirect URI matches.
- Auto-confirm should stay OFF (verification email required); confirm this too.
- Separately: fix the digest DLQ (`aiSubject: true` bug already patched previously — verify redeployed).

## Technical details

- `src/components/auth/AuthFormPanel.tsx`: remove phone input + state + validation; simplify submit; fix redirect target.
- `src/contexts/AuthContext.tsx`: signature stays the same but we pass `phoneNumber = undefined`; drop unused param eventually.
- Test file for auth if any snapshots reference the phone field.
- Playwright scripts under `/tmp/browser/` for the 6 publish paths (won't be committed; used for verification).
- `rg` sweep for "escrow" replacing user-facing copy; keep legal terms of art where accurate.

## Out of scope for this pass (per your directives)

- No changes to fee/commission/hold/payout math.
- No changes to the terms gate itself.
- No changes to `create-checkout` money logic — only its `success_url` and `cancel_url` for wizard-context returns.

## Deliverable

At end I'll post: root cause summary, exact owner config changes, publish matrix results (6 rows pass/fail with evidence), CTA fixes, and typecheck output.
