## Findings report

### Current state
- `/pricing` and `/plans` both render `Pricing.tsx` (already de-duped). `/host/plans` → `HostProPlans`, `/services` → `ServicesHub`, `/buyer/services` → `BuyerServicesHub`, `/tools/permitpath/upgrades` → `PermitPathUpgrades`, `/partners` exists. Ready to unify under one intro.
- Two entitlement hooks already exist: `useEntitlements` (all purchases + subs, keyed by slug/listing) and `useHostEntitlements` (tier feature flags). Both work but the tier hook only recognises `starter | pro | premium`, while the actual product catalog ships `host_starter`, `host_growth`, `host_operator`, and `seller_plus_*`. This is the biggest enforcement gap.
- Promotion flow (`listing_promotions`) is enforced end-to-end for boosts with `promo_type + duration_days` set on the product row: webhook + reconciler insert, `notify-expired-boosts` deactivates. `PromoteListingPanel` reads them back correctly.
- `Purchases.tsx` reads from `useEntitlements` and lists subs + one-times with status badge, but time-boxed items (boosts) never show an `endsAt` because `useEntitlements` does not join `listing_promotions.ends_at`.
- After a monetization checkout the user lands on a per-slug return path (`returnRoutes.ts`) but there is no unified "what you just unlocked" confirmation.

### Packages sold but not enforced (audit result)
| Slug | Category | Enforcement gap |
|---|---|---|
| `host_starter`, `host_growth`, `host_operator` (+ `_annual`) | host_subscription | `useHostEntitlements` maps only `starter/pro/premium` → these tiers resolve to `free` and unlock nothing. Every `canAdvancedAnalytics`, `canPriorityPlacement`, `canBulkListings`, `canPrioritySupport`, `canDedicatedConcierge` gate fails for paying hosts. **Highest priority fix.** |
| `seller_plus_monthly`, `seller_plus_annual` | host_subscription | Same tier-mapping problem; also no feature flags defined for a "seller_plus" role. |
| `seller-pro` | listing_upgrade | No `promo_type` in DB, no listing-level flag set on purchase, no gate reads it. Currently a paid product with no delivered benefit. |
| `boost-motivated-seller`, `boost-email-campaign`, `boost-social-feature` | listing_upgrade | `listing_promotions` row is created (badge visible in `PromoteListingPanel`), but nothing on the marketing side actually sends the campaign / social post / applies the badge in search. Fulfillment task record is missing. |
| `buyer_readiness_pass` | buyer_service | Purchased → status flips to `paid` but no `buyer_service_requests` row, no deliverable, no visible unlock in buyer dashboard. (`listing_purchase_review` does have an intake page — good reference.) |
| `pricing_review` | seller_service | No fulfillment task row, no visible "your review is in progress" surface. |
| `permit_path_plus`, `permit_path_concierge` | permit_upgrade | Purchase completes but PermitPath premium walls do not read entitlements; user still hits the paywall after paying. |

Fulfilled correctly today: `featured-listing-30`, `boost-featured-7/30`, `boost-top-of-search`, `boost-highlight` (all drive `listing_promotions`), `white-glove-seller` and `listing_rewrite` (route to intake), `listing_purchase_review` (has intake).

### Root cause of the tier gap
`useHostEntitlements` was written for a 3-tier model and never updated when the catalog expanded. Fix once in the hook by normalising the DB tier string to a rank, and every downstream gate + card + quota banner starts working.

---

## Proposed plan

### 1. `PackagesIntro` component (new)
`src/components/monetization/PackagesIntro.tsx` — two variants:
- `variant="hero"` — full section with eyebrow, headline, subhead, 4 pillar cards (Host Plans, Listing Upgrades, Done-for-you Services, Protected Payments & Partners), close line. One ember-glow accent on the "recommended" pillar (prop `recommendedIndex`, defaults to Host Plans).
- `variant="compact"` — inline horizontal strip: eyebrow + one-line subhead + 4 pill links. For high-intent placements.
Tokens only: near-black surface (`bg-background/60` + `glass-panel`), flame `#FF5124` for the highlighted pillar, Fredoka on headline, Poppins on body (already global). Uses exact copy from the brief. Ships an `AudienceSegments` sub-component for the "For Sellers / Buyers / Hosts" trio.

### 2. `/pricing` becomes the canonical hub
- Lead with `<PackagesIntro variant="hero" />`.
- Insert an `AudienceSegments` block linking: For Sellers → `/services` + `/host/plans` + `/pricing#upgrades`; For Buyers → `/buyer/services` + `/checkout` info; For Hosts → `/host/plans` + `/partners`.
- Keep existing subscription / upgrade / add-on grids below.
- `/plans` already aliases to `Pricing`. Add a small deprecation redirect note on `HostProPlans` so its hero shares the same `PackagesIntro compact` variant for consistency, without breaking its plan grid.

### 3. Contextual compact placements (high-intent only)
- `ListingPublished.tsx` — add `<PackagesIntro variant="compact" audience="seller" />` above `PromoteListingPanel`.
- `HostListings.tsx` + `Dashboard` — inject a single compact strip when the user has at least one non-featured listing OR is on the free tier.
- `Account.tsx` — compact strip next to `HostSubscriptionCard`.
- Owner's own `/listing/:id` — "Boost this listing" compact CTA (only if `isOwner` and no active promotion).
- `SaleCheckout` / `/checkout/:listingId` — compact "Financing & purchase review" strip in the sidebar (buyer audience).
- `PermitPathUpgrades` premium wall — compact strip.
- Add one `/pricing` link to `Header` nav and `Footer`.
No banners anywhere else.

### 4. Entitlement source of truth
- Extend `useEntitlements`:
  - Also fetch `listing_promotions` where `active = true AND ends_at > now()` for the user's listings, and merge as entitlements with `endsAt`.
  - Add helper `getUnlocked(): { hostTier, activePromotionsByListing, oneTimeServices[] }`.
- Fix `useHostEntitlements` tier mapping:
  - Normalise DB `tier` → canonical rank: `host_starter|seller_plus_* → 1`, `host_growth → 2`, `host_operator → 3`. Keep legacy `starter/pro/premium` working.
  - Update feature-flag thresholds accordingly and export a `planLabel` so cards show the real product name.
- Server-side: add `supabase/functions/_shared/entitlements.ts` that resolves the same shape from the request's JWT. Have `create-monetization-checkout`, `admin-monetization-grant`, and any PermitPath premium function call it before enabling access. Prevent buying a subscription that is already active (idempotency).
- Wire a fulfillment task row on webhook success for the currently-orphan products (`buyer_readiness_pass`, `pricing_review`, `seller-pro`, campaign/social boosts) into an existing table pattern — either `buyer_service_requests` (buyer side) or a new `seller_service_requests` mirror (seller side). Assign to `service_partners` or admin queue.

### 5. "What you unlocked" moment
- New `src/components/monetization/UnlockedConfirmation.tsx`. Renders after successful purchase (called from `returnRoutes` landing pages or a shared `PurchaseSuccess` route): title, exactly-what-is-active list (pulled from refreshed `useEntitlements`), "where to use it" deep links, and end date for time-boxed items.
- Update `Purchases.tsx` to:
  - Show `endsAt` on one-time boosts (now available from the promotion merge).
  - Group by category (Subscriptions / Active boosts / Services in progress / Completed).
  - Link each row to the surface where the benefit is used.

### 6. Copy guardrail
- Grep all new/changed files for `escrow` — force "payment protection" / "protected payments".
- Add an ESLint custom rule note in a project doc? Out of scope; use grep in PR instead.

### Files to add
- `src/components/monetization/PackagesIntro.tsx`
- `src/components/monetization/AudienceSegments.tsx`
- `src/components/monetization/UnlockedConfirmation.tsx`
- `supabase/functions/_shared/entitlements.ts`

### Files to edit
- `src/hooks/useHostEntitlements.ts` (tier mapping fix)
- `src/hooks/useEntitlements.ts` (merge listing_promotions + endsAt)
- `src/pages/Pricing.tsx`, `src/pages/HostProPlans.tsx` (share hero)
- `src/pages/ListingPublished.tsx`, `src/pages/HostListings.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Account.tsx`, `src/pages/SaleCheckout.tsx`, `src/pages/PermitPathUpgrades.tsx`, listing-detail owner header (compact placements)
- `src/components/layout/Header.tsx`, `src/components/layout/Footer.tsx` (Pricing link)
- `src/pages/Purchases.tsx` (grouping + endsAt + deep links)
- `supabase/functions/monetization-webhook/index.ts` (fulfillment task creation for orphan products)
- `supabase/functions/create-monetization-checkout/index.ts` (idempotency + shared entitlement check)

### Out of scope
- Rebuilding partner directory
- Restructuring `monetization_products` schema
- Payment logic in `stripe-webhook` / `create-checkout` for sales — untouched

### Wait for approval before editing.