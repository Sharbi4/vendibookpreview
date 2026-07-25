# Signup → List → Publish Audit — Findings & Fix Plan

## 1. Publish blockers enumerated (real UI path)

Order they are evaluated in `PublishWizard.handlePublish` (lines 1373–1770):

| # | Gate | Loud? | Notes / Fix needed |
|---|---|---|---|
| A | `getValidationErrors()` — photos ≥ 3, price, title ≥ 5, description ≥ 50, location, payment method (sale) | ✅ Loud toast, but only shows FIRST error | **Fix:** show all missing items (join with " • "), name the wizard step |
| B | Stripe Connect (`stripeRequired && !isOnboardingComplete`) | ✅ Loud, but no CTA button in toast | **Fix:** add "Connect Stripe" action button that calls `connectStripe()` |
| C | Identity verified (`!isVerified`) | ✅ Loud with "Verify now" link | OK |
| D | Listing quota (`quota.isAtLimit`, first publish only) | ✅ Opens `ListingLimitReachedModal` | OK |
| E | Media upload (no `user`) | ⚠️ Toast shown but `handlePublish` was already past the auth check; guest can't reach here anyway | OK |
| F | Notary / featured checkout branch — Stripe Checkout errors | ✅ Loud with support ref | OK |
| G | **Final `listings.update` RLS / trigger errors** | ⚠️ Only `listing_publish_limit_reached` is decoded; other Postgres errors (e.g. `row-level security`, `null value in column X`, `trg_enforce_listing_publish_limit` raise, geocoding trigger) surface as raw `error.message` | **Fix:** map known SQLSTATE / error text to actionable copy (RLS → "Please sign back in", NOT NULL → name the field, listing-limit trigger → open the limit modal) |
| H | **UNTESTED PATH:** card-payment sale published without Stripe connected | Blocked at gate B, but the CURRENT smoke test always sets `accept_card_payment=false`, so a regression in the Stripe gate would ship unnoticed | **Fix:** add card-payment scenario to `publish-flow-smoke.ts` and assert the DB row STAYS `draft` when Stripe not onboarded |
| I | **Publish-limit DB trigger** exists (`trg_enforce_listing_publish_limit`) but the client only catches it in the standard branch, NOT in the notary or featured branches (lines 1544–1547, 1599–1615 handle it — actually 1609 does; notary at 1544 does NOT) | ⚠️ Silent in notary branch | **Fix:** apply same limit-error decoding to notary persist |

## 2. Signup → wizard continuity

Traced sequence:

```text
/list (QuickStartWizard)
  → user picks category+mode+ZIP
  → sessionStorage['vendibook_quickstart_draft'] = {data, step}   ✅ preserved
  → clicks Continue while signed out
    → sessionStorage['vendibook_quickstart_resume'] = '1'         ✅ resume flag
    → navigate('/auth?redirect=/list')                            ✅
  → /auth signs user in
    → navigates back to /list                                     ✅
  → QuickStartWizard mounts, useEffect on [user] auto-calls
    handleCreateDraft() when resume flag set                      ✅
  → create-listing-draft edge fn:
       - upserts user_roles(host)                                 ✅
       - inserts listings row with host_id                        ✅ (service role, bypasses RLS)
  → refreshProfile()                                              ✅
  → navigate(`/create-listing/${id}`)                             ✅
```

**Gaps found:**

- **G1. No `profiles` row is guaranteed on first draft.** `create-listing-draft` upserts `user_roles` but never touches `public.profiles`. Downstream: `useListingQuota` queries `profiles.grandfathered_listings` with `.maybeSingle()` (safe), but the identity-verified gate reads `profile?.identity_verified` — if the auth trigger `handle_new_user` is missing or failed, `profile` is null forever and the user can never publish. **Fix:** have `create-listing-draft` also upsert a minimal `profiles` row (id, email) with `onConflict: 'id'` before inserting the listing.
- **G2. Email-verification gap.** If Supabase email confirmation is on, the OAuth-less signup returns a user with no session; `handleCreateDraft`'s post-login effect fires but `getSession()` is null → generic "Please sign in" toast. **Fix:** detect this in the resume effect and show a "Check your email to confirm and return to /list" state instead of a red error.
- **G3. `/auth` redirect param inconsistency.** `QuickStartWizard` uses `?redirect=/list`; `EditListing` uses `?redirect=<path>`; `Auth.tsx` reads both `redirect` and `returnTo` — OK. But `CreateListing.tsx` uses `?redirect=<pathname+search>` which is correct; nothing to change.
- **G4. Wizard step (`?step=`) preservation.** `EditListing` preserves `location.search` on redirect ✅. `PublishWizard` internal `step` state is NOT written to the URL, so a mid-wizard refresh/relogin drops the user back to the `photos` step. **Fix:** mirror `step` into URL `?step=` so relogin lands on the same step (out of scope for this pass — flag only, no code change unless approved).

## 3. Duplicate-row regression guard

- `handlePublish` uses `.update(...).eq('id', listing.id)` in all three branches (notary, featured, standard). No `.insert()` occurs during publish. ✅
- `saveGuestDraftFields` uses `.update()` or the guest-draft-access function (which also updates). ✅
- `create-listing-draft` is the SOLE inserter and is called exactly once by `QuickStartWizard`. ✅

Existing smoke covers this. Nothing to fix.

## 4. Pre-deploy gate is likely inert

- `scripts/smoke/publish-flow-smoke.ts` exits 0 with `console.warn` when `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are missing. On GitHub Actions this prints a warning but the job is green — indistinguishable from a real pass.
- Same skip-and-pass pattern also exists in `boost-publish-smoke.ts`, `delete-listing-smoke.ts`, `entitlement-*-smoke.ts`, `subscription-lifecycle-smoke.ts`.
- **Cannot verify from sandbox** whether the repo owner has `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` set in **Settings → Secrets and variables → Actions**. Report to user: those two secrets must be present at repo level for ANY of the DB smokes to actually execute.

**Fix:** make the skip path LOUD:
- Print `::warning::SKIPPED — secrets not configured` (GitHub Actions annotation) so CI shows a yellow warning banner.
- Add a `smoke-gate-status` job that fails when *both* secrets are missing on `push: main`, so an unconfigured gate cannot masquerade as green on production deploys. (Still soft-warns on PRs from forks where secrets can't be shared.)

## 5. Extend publish-flow-smoke with real-world blocked cases

Add three scenarios to `scripts/smoke/publish-flow-smoke.ts` (still service-role DB simulation — no browser):

- **5a. Card-payment sale without Stripe onboarded** — create draft with `accept_card_payment=true`, profile with `stripe_account_id=NULL`, attempt the publish `update`, then assert via a separate check that the app-level gate would block (simulate by asserting `requiresStripe && !isOnboardingComplete` on a fixture); since the trigger allows the DB write, we instead assert the row's `accept_card_payment` state matches what the gate reads. This tests the *data contract* the gate depends on.
- **5b. Unverified-identity host** — profile with `identity_verified=false`; simulate the client-side gate by asserting `profile.identity_verified === false` after draft creation. The DB doesn't enforce it, so we assert the fixture the UI reads.
- **5c. Host at listing limit** — create N=quota published rows then attempt an (N+1)th publish; expect the `trg_enforce_listing_publish_limit` trigger to raise `listing_publish_limit_reached`. This is the ONLY one of the three enforced server-side and is a real regression guard.

Scenarios 5a/5b are honest about what the DB smoke can verify vs. what needs the browser smoke (`wizard-auth-guard-smoke.ts`).

## 6. Live end-to-end test after fixes

Run the new `publish-flow-smoke.ts` (with all three scenarios), plus the existing `wizard-auth-guard-smoke.ts`, against `http://localhost:8080` and report the transition of each stage:
`signup → profile row → draft → wizard save → publish → live in search`.
Then `tsgo` typecheck.

---

## Proposed edits (small, surgical)

1. **`supabase/functions/create-listing-draft/index.ts`** — before inserting the listing, upsert `public.profiles { id: user.id, email: user.email }` with `onConflict: 'id'`. Guarantees the row required by `useAuth`, `useListingQuota`, and identity gate. (Fix G1.)

2. **`src/components/listing-wizard/PublishWizard.tsx` (`handlePublish` catch + `getValidationErrors`)**:
   - Show ALL validation errors, not just the first.
   - Add a `Connect Stripe` action to the Stripe gate toast.
   - Decode common publish `error.message` values (RLS `permission denied`, `null value in column`, `listing_publish_limit_reached` in the notary branch) into actionable toasts naming the blocker.

3. **`src/components/listing-wizard/QuickStartWizard.tsx`** — in the resume effect, if `!sessionData.session` after user object exists (email-confirm pending), show a friendly "Check your email to confirm" state instead of the generic red toast. (Fix G2.)

4. **`scripts/smoke/publish-flow-smoke.ts`**:
   - Replace silent `process.exit(0)` on missing secrets with `console.log('::warning::…SKIPPED…')` and a distinct `[smoke] SKIPPED` header.
   - Add scenarios 5a/5b/5c described above, each with clear pass/fail messages.

5. **`.github/workflows/smoke-predeploy.yml`** — add a lightweight `secrets-configured` gate job (fails on `push: main` when `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are empty) so an unconfigured deploy pipeline can't ship green.

6. **Report to user (chat, not code):** exact GitHub secrets to add if missing — `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and optionally `APP_BASE_URL` for browser smokes.

## Out of scope (flagged, not fixing unless approved)
- Persisting `PublishWizard` step to the URL (G4).
- Server-side enforcement of identity verification and Stripe onboarding at publish (currently client-only gates; a determined API caller with a valid JWT could set `status='published'`).

Approve to proceed; I'll implement 1–6, run the smoke locally, then typecheck and report each stage's pass/fail.
