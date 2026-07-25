
## 1. Discovery — current state (what's actually true today)

**Prices stay:** Starter $39 / Growth $89 / Operator $149. This pass changes contents + presentation + enforcement, not amounts.

**Tier data source:** `PremiumTierCard` renders `product.features.slice(0, 7)` from `monetization_products.features` (DB rows). To ship a Sellers/Hosts split we stop reading DB feature strings for the three tier cards and drive them from a typed catalog inside `PremiumPlansSection` (`TIER_FEATURES`) — same file that already owns tier ordering. DB rows keep their features for other surfaces.

**No Free column exists today.** Add a 4th `FreeTierCard` (or `PremiumTierCard` variant with `role: 'free'`) so the grid becomes 4-up on desktop, stacks on mobile.

**Listing-limit enforcement (flagged):**
- `useListingQuota` declares `free: 3, starter: 10, pro/premium: null`.
- Consumers: only `ListingQuotaBanner` (visual banner on `/host/listings`). **Nothing gates the publish flow — free users can publish unlimited listings today.** The banner is cosmetic.
- Action needed: **owner decision required** — options in section 6 below.

**E-signature status:** Rental and sale flows already produce online-signed agreements (see `transaction_terms`, booking documents), but nothing on the plans page, listing cards, checkout, or publish step surfaces this as a free trust feature.

**Access enforcement (audit summary):**
- Client gates: `useToolAccess` (tier + purchase + grandfathered).
- Server gates: spot-check needed on premium-tool edge functions (`ai-listing-creator`, PricePilot RPCs, market radar, etc.) — I'll enumerate in section 5 and fix any that trust the client.
- Featured Boost: `listing_promotions` row with `ends_at` in future — already server-authoritative.

## 2. Tier map (final, delivering-only) — every line must have a real backing feature

I'll flag any line that lists a feature not yet delivered so we don't ship marketing that doesn't work.

### FREE — $0 "Start free — list without paying anything"
For sellers
- List trucks and trailers for free — no monthly cost
- Unlimited buyer inquiries and messages
- Secure card payments with payment protection
- **Free e-signatures on every bill of sale** ✅ delivered (`transaction_terms`)
- Basic seller dashboard

For hosts
- List kitchens and vendor spaces free
- Unlimited renter inquiries and messages
- Secure card payments with payment protection
- **Free e-signatures on every rental agreement** ✅ delivered
- Basic host dashboard, booking calendar

Everyone
- PermitPath basic + Startup Guide

CTA: **Start free** → `/auth?returnTo=/dashboard` (or `/list-your-space` if signed in).

### STARTER — $39/mo "List like a pro"
Everything in Free, plus:

For sellers
- Enhanced listing tools (extra photos, richer specs, highlight badges)
- AI listing description generator ✅ delivered (`ai-listing-creator`)
- Priority placement basics (above free tier in category feeds) — ⚠️ **FLAG:** verify `listings` ordering respects tier; if not, wire it or drop this line

For hosts
- Booking calendar + inquiry management ✅
- Automated renter messages ✅

Both
- Basic analytics ✅
- Priority email support

### GROWTH — $89/mo (Recommended) "Sell and book faster"
Everything in Starter, plus:

For sellers
- **1 active Featured Boost included** (equivalent to `boost-featured-30`)
- Full premium tools bundle unlocked — matches "free with Pro" copy on `/tools`:
  - PricePilot ✅
  - Listing Studio ✅
  - Marketing Studio ✅
  - Concept Lab ✅
  - Market Radar ✅
  - PermitPath Plus ✅

For hosts
- Multiple active listings ✅
- Recurring availability ✅
- Storage add-ons, cleaning fees, custom deposits, custom cancellation rules ✅

Both
- $10 off notarization ($39 instead of $49) — ⚠️ **FLAG:** notarization SKU price not yet member-discounted in catalog; either add a `member_discount_cents` field or apply at checkout. Ships alongside this pass.

### OPERATOR — $149/mo "Run your whole operation"
Everything in Growth, plus:
- Team member access & permissions ✅ (schema exists)
- Multi-location / fleet tools ✅
- Utilization analytics + accounting exports ✅ delivered on `/host/analytics`
- Custom intake questions — ⚠️ **FLAG:** UI exists but gate not wired; will add tier check
- BuildKit included ✅
- Dedicated support

CTA: **Talk business — go Premium**.

## 3. E-signature as a standard trust feature (Free, all users)

New shared component `TrustESignChip` (subtle token-styled pill with `FileSignature` icon + tooltip: *"Agreements and bills of sale are signed online, free."*). Placed:

1. **Plans page** — inside every tier card's feature list (Free through Operator) via the tier catalog above.
2. **Comparison table** — new row `Free e-signatures on every agreement` = check across all four columns.
3. **Checkout trust row** — appended to `PaymentProtectionBlock` area on `SaleCheckout` / `BookingCheckout`, plus the trust row inside `PremiumPlansSection` at bottom.
4. **Listing cards** — `ListingCard.tsx` gets one small chip in the bottom-right of the image area (next to Calendar/Quick Book icons), rendered for both `mode === 'sale'` and `mode === 'rent'`. Also `PhotoListingCard` (dashboard).
5. **Listing publish step** — appended reassurance line in the publish/review step of the wizard: *"Every sale and rental includes free online signatures — agreements handled for you."*

## 4. Learn-more overlays + consent dialog copy

- `learnMoreCatalog.ts` — add a new `host_free` entry (Free plan) with outcomes matching section 2; refresh `host_starter`, `host_growth`, `host_operator` outcomes to include the sellers/hosts split and the e-signature line.
- `SubscriptionConsentDialog` — refresh the plan-name-driven bullet list to match the top ~5 outcomes of the new tier map for the plan being purchased. Auto-renews / cancel-anytime disclosure copy stays **byte-identical**.

## 5. Exclusive access enforcement — audit + fixes

For each paid benefit line I'll verify server-side enforcement, not just client hiding:

| Feature | Client gate | Server gate | Action |
|---|---|---|---|
| Featured Boost credit (Growth) | `useToolAccess` / entitlements | `listing_promotions.ends_at > now()` | ✅ already server-authoritative |
| Premium tools bundle (Growth+) | `useToolAccess` | Per-tool edge functions | Audit `ai-listing-creator`, `pricepilot-*`, `market-radar-*`, `listing-studio-*` for tier check — add missing `has_role`-style tier check via `host_subscriptions` |
| Multi-location, custom intake, team access (Operator) | React guards | Server check on the write RPCs | Audit / add |
| $10 notarization discount (Growth+) | UI badge | Applied in `create-checkout` price selection | Wire member-discount branch |
| AI description generator (Starter+) | Existing | Verify tier check in `ai-listing-creator` edge fn | Audit |

Each gated edge function will (a) read the bearer token, (b) resolve the tier via a shared `resolveHostTier(userId)` helper querying `host_subscriptions` (status IN active/trialing/past_due, plus one-time purchase fallback via `monetization_purchases`), (c) return 403 with `{ code: 'tier_required', requires: 'pro' }` when denied. Expired subs revert immediately because the check is live-DB, not cached.

Spot-test acceptance:
- Free user hits `/tools/pricepilot` → sees paywall UI + calling the edge fn returns 403.
- Growth user → tools unlocked, Featured credit visible in `/host/listings` header.
- Cancelled/expired subscriber → tier resolves to `free` at next query; access reverts.

I'll run the tests with actual seeded users after the code lands.

## 6. Listing-limit flag — decision needed before enforcement

**Current behavior:** the "3 for free / 10 for Starter" numbers are declared in `useListingQuota` but only render a banner on `/host/listings`. Publish and unpause paths do NOT block; every free user can publish unlimited listings today.

Options for you to pick (this pass will NOT ship enforcement):
- **A. Keep unlimited for everyone** — drop the banner and quota numbers, promise "Unlimited listings on every plan" in the tier catalog. Simplest, most generous.
- **B. Free = 2 active going forward, grandfather anyone above 2** — enforce on publish + unpause, exempt existing accounts whose count exceeded 2 as of a snapshot date.
- **C. Free = 3 (match the current banner) going forward, grandfather existing** — same mechanic, higher cap.

I recommend **A** for now (matches the "Start free — list without paying anything" positioning) and revisit if abuse shows up. Awaiting your call before touching enforcement or the plans catalog copy on this line.

## 7. Files touched

**Plans surface**
- `src/components/monetization/PremiumPlansSection.tsx` — 4-col grid, new tier catalog with For sellers / For hosts groups, tier-driven features (not DB `features` array).
- `src/components/monetization/PremiumTierCard.tsx` — accept typed feature groups instead of raw string list; render grouped headers; keep animation/consent/learn-more wiring.
- `src/components/monetization/FreeTierCard.tsx` (new) — thin variant of `PremiumTierCard` for `$0` / "Start free" CTA (no Stripe call).
- `src/components/monetization/PlansComparisonTable.tsx` — add `free` column, add e-signature row, refresh rows to match section 2.
- `src/lib/monetization/learnMoreCatalog.ts` — add `host_free`, refresh growth/operator outcomes.
- `src/components/monetization/SubscriptionConsentDialog.tsx` — copy refresh, disclosures untouched.

**E-signature**
- `src/components/trust/TrustESignChip.tsx` (new) — shared chip + tooltip.
- `src/components/listing/ListingCard.tsx` + `src/components/dashboard/shared/PhotoListingCard.tsx` — render chip.
- `src/components/checkout/PaymentProtectionBlock.tsx` — append e-sign line to trust surface (or sibling component so the block stays focused).
- Listing wizard publish/review step (locate exact file during implementation) — add reassurance line.

**Enforcement**
- `supabase/functions/_shared/resolveHostTier.ts` (new) — shared server helper.
- Edge functions listed in section 5 — add tier gate + 403.
- `create-checkout` — member notarization discount branch.

**Nothing else changes.** Prices, terms gate, `create-checkout` monetary logic, existing agreement/e-sign backend all untouched.

## 8. Reports at the end

- Final tier map (mirrors section 2) with any line still flagged.
- Listing-limit report (current behavior + owner options).
- Enforcement pass/fail table across the three test personas (free / Growth / expired).
- Typecheck result.
