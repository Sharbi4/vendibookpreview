## Goals

1. Verify publish flow works end-to-end for every persona (free, founding, Starter, Growth, mid-trial), fix any dead-ends.
2. Add two never-blocking membership prompts: post-signup welcome + a slim publish-time comparison panel.
3. Ensure mid-flow upgrade returns cleanly to the wizard step with entitlements live and draft intact.
4. Enforce copy rule: **"Listing is always free"** on both prompts; no dark patterns.

---

## Part 1 — Publish flow verification (report + fix)

Deliver a matrix by driving a Playwright smoke against localhost + reading the wizard/publish code paths. Personas simulated by seeding `user_roles`, `host_subscriptions`, and (for founding) the grandfathered flag.

Per persona check: draft create → required fields → identity gate (unverified friendly explainer + returns to publish step) → publish → appears in Browse + dashboard Listings → quota modal triggers on 3rd for free / never for founding → active Featured Boost is applied on publish.

Report a pass/fail table and fix each failure. Expected fix zones based on prior audits:
- `PublishWizard.handlePublish` continuity when redirected to `/verify-identity` (must use `returnTo` per `originNav`).
- Quota-exceeded modal from `useListingQuota` (friendly copy, not error toast).
- Featured pending-boost application already covered by trigger — smoke re-verifies.

No money-logic, RLS, or webhook changes.

## Part 2 — Post-signup welcome (once)

New route `/welcome` + component `src/components/onboarding/SignupWelcome.tsx`.

- Triggered from `Auth.tsx` on successful **new** signup (flag via `profiles.onboarded_at IS NULL` — one migration to add the column if missing) with a `returnTo` param preserved.
- Content: headline **"Welcome to Vendibook — listing is always free."**, 3-column mini comparison (Free · Starter $39 · Growth $89), two equal-weight buttons **Continue free** and **See memberships** (→ `/pricing?from=welcome`).
- On dismiss/continue: set `profiles.onboarded_at = now()` so it never shows again.
- Skippable via clear X. No pre-selection. No card required.

## Part 3 — Publish-time membership panel (once per user)

New component `src/components/listing-wizard/MembershipInlinePanel.tsx` rendered inside `PublishWizard` above the checklist on the review step (and inside `QuickStartWizard` first step for brand-new hosts).

- Slim, dismissible; localStorage key `vb:mship-panel-dismissed:v1` + `profiles.membership_panel_dismissed_at`.
- Headline **"Publish free, or grow faster with a membership."**
- 4-row × 3-col chart (Free / Starter / Growth): Active listings (2 · 5 · Unlimited — founding shows "Unlimited — early member"), Listing tools (— · AI descriptions · Full tools bundle), Placement (Standard · Priority basics · Featured credit), Support (Standard · Priority · Priority).
- All cells use ✓ marks; Free column not grayed. Two equal-weight buttons: **Continue free** (dismiss) and **Upgrade** (→ `/pricing?returnTo=<currentWizardStep>`).
- Dismiss = never blocks again; small `Plans` link remains in wizard footer.

## Part 4 — Mid-flow upgrade continuity

Confirm and patch:
- Any CTA from the panel or `usePremiumUpsell` passes `returnTo=/list?draftId=<id>&step=<n>` when launching checkout.
- `PaymentSuccess` already honors `returnTo`; add explicit test that entitlements resolved from `useHostEntitlements` refetch on mount so tools unlock immediately.
- `PublishWizard` reads `?step=` and restores step + loads draft via `useListingForm`.
- Featured Boost mid-publish uses existing `create-featured-checkout` returning to `/list?...&step=review`; on success the pending boost is auto-applied by the publish trigger.

## Part 5 — Copy audit

Sweep the two new components + Pricing hero + PackagesIntro Compact variant to include **"Listing is always free"** phrasing and remove any "required to publish" framing.

## Files to add

- `src/components/onboarding/SignupWelcome.tsx`
- `src/pages/Welcome.tsx` (route wrapper)
- `src/components/listing-wizard/MembershipInlinePanel.tsx`
- `src/components/monetization/MiniPlansComparison.tsx` (shared 3-col table used by both prompts)
- `supabase/migrations/<ts>_profiles_onboarding_flags.sql` — add `onboarded_at`, `membership_panel_dismissed_at` (nullable timestamps) + GRANTs unchanged (no new table).
- `scripts/smoke/publish-personas-smoke.ts` — extends existing publish smoke with the 5 personas + quota + featured-on-publish assertions; wired into `.github/workflows/smoke-predeploy.yml`.

## Files to edit

- `src/pages/Auth.tsx` — after signup redirect to `/welcome?returnTo=<original>` if `onboarded_at` null.
- `src/App.tsx` (router) — register `/welcome`.
- `src/components/listing-wizard/PublishWizard.tsx` — mount panel; ensure `returnTo` on identity redirect; friendly quota modal when `useListingQuota().isAtLimit`.
- `src/components/listing-wizard/QuickStartWizard.tsx` — mount panel on first-listing users.
- `src/pages/CreateListing.tsx` — pass `step` query through.
- `src/hooks/usePremiumUpsell.tsx` — ensure `returnTo` builder appends `step`.
- `src/pages/Pricing.tsx` — honor `?from=welcome` (small "You can always list for free" reassurance strip).

## Non-goals

- No fee changes, no webhook changes, no RLS changes.
- No changes to Stripe products or entitlement rules.
- No redesign of `/pricing` beyond the reassurance strip.

## Verification

- `tsgo --noEmit` clean.
- Playwright script drives: signup → welcome → continue free → create listing → panel visible → dismiss → publish; separately: upgrade path → return to `step=review` → publish.
- Existing `publish-flow-smoke.ts` + new `publish-personas-smoke.ts` both green in CI.
- Report pass/fail per persona + two screenshots (welcome, publish panel) + mid-flow upgrade result.
