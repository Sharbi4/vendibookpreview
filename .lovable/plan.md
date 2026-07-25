## Scope

Prior turns already shipped the heavy lifting: `/welcome` post-signup screen, `MembershipInlinePanel` in the Review step, `ListingLimitReachedModal` + DB trigger `enforce_listing_publish_limit`, `grandfathered_listings` backfill, `MiniPlansComparison` with founding-member note, and `ListingPublished` with `BoostListingPrompt` + boost webhook self-heal. This plan closes the remaining gaps against the new spec — no rebuilds.

## 1. Copy + CTA alignment (the "free is always fine" rule)

**`src/pages/Welcome.tsx`**
- Headline → "Welcome to Vendibook — listing is always free."
- Primary button → "Start free" (was "Continue free")
- Secondary → "See member benefits" (opens the compact MiniPlansComparison already on this page; no auto-select).
- Add subline: "Memberships are optional boosts."

**`src/components/listing-wizard/MembershipInlinePanel.tsx`**
- Headline → "Your listing is free. Members get seen first."
- Sub → "Listing is free, always. Memberships are optional boosts."
- CTAs → `Continue free` (outline, equal weight) and `Go Pro` (was `Upgrade`).
- Session-scoped suppression: once user clicks Continue free within the same wizard session, don't re-render even if they navigate steps back and forward (already persisted; add a `sessionStorage` guard so re-entering the wizard later still shows it once until the persistent dismiss fires).

**`src/components/monetization/MiniPlansComparison.tsx`**
- Mark Growth column as "Recommended" (small pill above header, orange tint).
- Trim to exactly 6 rows in this order: Active listings · Featured placement · AI listing tools · PermitPath Plus · Fees · Support. Free column always shows a real value (no em-dashes / crossed-out) — e.g. Featured placement = "Standard", AI tools = "Basic templates", PermitPath = "Free checklist", Fees = "12.9%", Support = "Standard".

## 2. Post-publish "Feature this listing" one-liner

**`src/pages/ListingPublished.tsx`**
- Insert a compact `FeatureThisListingCTA` row directly under the success banner, above `ShareKit`: title "Want more eyes on it? Feature this listing", one-line pitch, price from monetization catalog, primary button "Feature for 30 days" (routes to existing boost checkout via `BoostListingPrompt`'s handler), secondary "Not now" that hides the row for this listing (localStorage keyed by listing id). The existing full `BoostListingPrompt` below stays as the deeper offer.

## 3. Publish-flow scenario verification (test only; fixes if red)

Add a single Playwright script `tests/e2e/publish_scenarios.py` that walks and screenshots:
- (a) new free verified → publish succeeds
- (b) unverified → gate to `/verify-identity?returnTo=…` → returning restores wizard step (uses existing `originNav`)
- (c) grandfathered → publish 6th listing succeeds (uses seeded flag)
- (d) new free at 2 published → publish blocked with `ListingLimitReachedModal`; draft still saves
- (e) Starter → publish 5, block on 6
- (f) Growth → unlimited
- (g) mid-creation boost purchase → returns to Review step with data intact; `?featured_paid=true` self-heal publishes

Fix any red row uncovered. Expected: all green given prior migration + modal wiring; the script is the acceptance harness.

## 4. Typecheck + report

- `bunx tsgo --noEmit`
- Post: pass/fail table (a–g), screenshots of `/welcome`, the inline panel, and the post-publish boost row, and the list of files changed.

## Files changed (planned)

- `src/pages/Welcome.tsx` — copy + CTA labels
- `src/components/listing-wizard/MembershipInlinePanel.tsx` — copy + CTA + session guard
- `src/components/monetization/MiniPlansComparison.tsx` — Recommended pill + 6-row canonical set
- `src/pages/ListingPublished.tsx` — `FeatureThisListingCTA` row
- `src/components/dashboard/FeatureThisListingCTA.tsx` — new small component
- `tests/e2e/publish_scenarios.py` — verification harness

## Out of scope (do NOT touch)

- Money logic, quota trigger, checkout return contract, `create-checkout`/`create-cash-sale`, entitlement resolution, terms gate.
