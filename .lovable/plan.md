
## 1. Kill the identity repetition

**Current duplication (audited):**
- Desktop sidebar (`src/components/layout/DashboardLayout.tsx` L206-217) renders avatar + full_name + persona label + `IdentityChip`.
- Both `HostDashboard.tsx` (L127) and `ShopperDashboard.tsx` (L92) render `OverviewGreeting` = "Welcome back, {firstName}" + persona label + `IdentityChip`.
- Result: name shown twice, persona label twice, verify chip twice on desktop.

**Changes to `src/components/dashboard/overview/OverviewGreeting.tsx`:**
- Rewrite as a viewport-aware component:
  - Desktop (`sm:` and up): render only a tiny eyebrow line — `Overview · Tuesday, Jul 24` in `text-[12px] text-[rgb(var(--dash-text-2))]`. No name. No chip. No persona label.
  - Mobile (< `sm`): single 14px row — `Hi {firstName}` + inline `IdentityChip` (compact). Nothing else.
- Same file, same import site, no changes needed in `HostDashboard`/`ShopperDashboard`.

**Overview render order after change** (both personas):
```text
(mobile only) greeting row
(mobile only) pill tab bar  [DashboardMobileTabs]
KPI row
Attention stack
Recent activity
Premium module  [new — see §2]
```

Desktop: the KPI row is the first thing in the content area.

**Other identity collapses:**
- `CommandHeader.tsx` L33 renders "Good day, {name}" — this component is not on Overview per audit, leave alone. If it appears elsewhere on the dashboard route, remove that greeting line too.
- Verify no other avatar/full_name renders in the Overview content beyond the sidebar. Sidebar keeps its avatar + name + persona + chip (single source of identity on desktop).

## 2. Premium module (state-aware) as last Overview section

New component `src/components/dashboard/overview/PremiumSpotlight.tsx`.

**Free-tier state** — gold-accented `.dash-glass` card:
- Eyebrow: `VENDIBOOK PRO` in gold (`#D4A437`).
- Headline (single line): `Keep more of every sale and get seen first.`
- 3 benefit rows with lucide icons: `Percent` — Lower fees on every sale · `Sparkles` (replace per no-sparkle rule → `TrendingUp`) — Featured placement in search · `Wrench` — All premium tools included.
- Price anchor: `from $39/mo` (from `host_starter` monthly price).
- Single gold CTA button → `/pricing` (reuses the existing `GoProButton` styling tokens; no new gold-button variant).

**Paid-tier state** — compact "Your membership" card (no gold, standard glass):
- Tier badge (`Starter` / `Pro` / `Premium`) with gold outline for Pro/Premium.
- `Renews Mar 14, 2027` line from `host_subscriptions.current_period_end`.
- Two quiet links: `Manage billing` → `/account/subscription`, `Your benefits` → `/purchases`.

Data source: existing `useHostEntitlements()` (already returns `hostLabel` and subscription meta). One module. Rendered as the last block on Overview in both `HostDashboard.tsx` and `ShopperDashboard.tsx`. Never both states, never nothing.

## 3. Package catalog simplification

**Full inventory (30 active products, all with 0 purchases):**

Subscriptions:
| slug | price | grants |
|---|---|---|
| seller_plus_monthly | $29/mo | legacy tier |
| host_starter | $39/mo | Starter |
| host_growth | $89/mo | Pro |
| host_operator | $149/mo | Premium |
| seller_plus_annual | $290/yr | legacy |
| host_starter_annual | $390/yr | Starter annual |
| host_growth_annual | $890/yr | Pro annual |
| host_operator_annual | $1490/yr | Premium annual |

Listing upgrades:
| slug | price |
|---|---|
| boost-motivated-seller | $9 |
| boost-featured-7 | $19 |
| boost-highlight | $19 |
| boost-top-of-search | $39 |
| featured-listing-30 | $49 |
| boost-featured-30 | $49 |
| boost-social-feature | $49 |
| boost-email-campaign | $99 |
| seller-pro | $149 |

Seller services:
| slug | price |
|---|---|
| tool_listing_studio | $19 |
| tool_pricepilot | $19 |
| tool_concept_lab | $29 |
| tool_market_radar | $29 |
| pro_weekly_pass | $29 |
| tool_marketing_studio | $29 |
| tool_buildkit | $49 |
| listing_rewrite | $59 |
| pricing_review | $79 |
| white-glove-seller | $499 |

Buyer services:
| slug | price |
|---|---|
| buyer_readiness_pass | $29 |
| listing_purchase_review | $149 |

Permits:
| slug | price |
|---|---|
| permit_path_plus | $29 |
| permit_path_concierge | $299 |

**Simplified catalog — kept:**

Subscriptions (3):
- `host_starter` + `host_starter_annual` → surfaced as **Starter** ($39/mo)
- `host_growth` + `host_growth_annual` → **Pro** ($89/mo)
- `host_operator` + `host_operator_annual` → **Premium** ($149/mo)

One-time (4):
- `boost-featured-30` → **Featured Boost** ($49, 30 days)
- `permit_path_plus` → **PermitPath Plus** ($29)
- `listing_rewrite` → **Listing Makeover** ($59) — the one done-for-you seller service, absorbs `tool_listing_studio`, `pricing_review`, `boost-social-feature`, `boost-email-campaign` copy
- `pro_weekly_pass` → **Pro Weekly Pass** ($29, 7 days) — kept because it's the frictionless try-Pro entry the previous turn built

Notary/closing: no existing SKU, so nothing to add per prompt ("if it has real usage").

**Deactivate (is_active=false) — zero-purchase, redundant, safe to hide:**
- `seller_plus_monthly`, `seller_plus_annual` (legacy overlap with new tiers)
- `boost-motivated-seller`, `boost-featured-7`, `boost-highlight`, `boost-top-of-search`, `featured-listing-30`, `boost-social-feature`, `boost-email-campaign`, `seller-pro` (all fold into single Featured Boost)
- `tool_listing_studio`, `tool_pricepilot`, `tool_concept_lab`, `tool_market_radar`, `tool_marketing_studio`, `tool_buildkit` (folded into "included with Pro")
- `pricing_review`, `white-glove-seller` (folded into Listing Makeover; White Glove is $499 with 0 sales — collapse until demand proven)
- `permit_path_concierge` (folded — Pro users get concierge as included benefit; can be reactivated if demand emerges)
- `buyer_readiness_pass`, `listing_purchase_review` (buyer services with 0 purchases — hide until buyer growth funnel matures)

Rationale: zero purchases across every SKU means no entitlement risk. All are `is_active=false` only — rows preserved, prices preserved, historical `monetization_purchases` FKs preserved. Reversible in one SQL update.

**Migration:** `supabase/migrations/<ts>_simplify_catalog.sql` — a single `UPDATE monetization_products SET is_active=false WHERE slug IN (...)`. No `DELETE`, no schema change, no touching `monetization_purchases`.

**Frontend surfaces to update to the simplified set:**
- `src/lib/monetization/products.ts` `PROMOTED_SLUGS` (or equivalent allowlist) — restrict to the 3 tier slugs + 4 one-time slugs.
- `src/pages/Pricing.tsx` — tiers section already shows 3 tiers; ensure the one-time/boost section only surfaces the 4 kept SKUs with one-line "what you get":
  - Featured Boost: "Top of search + featured shelf for 30 days."
  - PermitPath Plus: "Full permit roadmap for your city with document links."
  - Listing Makeover: "We rewrite your listing and photos in 3 business days."
  - Pro Weekly Pass: "All Pro benefits for 7 days. No renewal."
- `src/components/dashboard/tabs/PromoteUpgradesTab.tsx` — filter to kept slugs.
- `src/components/dashboard/tabs/PremiumToolsTab.tsx` — tool tiles keep working (routes untouched), but the "unlock this tool" one-time SKU CTAs are hidden and replaced with "Included with Pro — Upgrade to unlock" going to `/pricing`.
- `src/components/monetization/PackagesIntro.tsx` — align copy to the 4-item catalog.

## 4. Verification pass

- `bunx tsgo --noEmit` after all edits.
- Playwright drive-through on desktop (1280w) and mobile (390w) of `/dashboard` for both personas:
  - Assert: no `Welcome back` / no duplicated name / one IdentityChip only.
  - Assert: Premium module renders (free vs paid state) as last Overview block.
  - Screenshot both viewports both personas → 4 shots to `/tmp/browser/dash/`.
- Visit `/pricing`, Promote & Upgrades tab, and any upsell cards → confirm only the 7 simplified SKUs render.

## Files changed

**New:**
- `src/components/dashboard/overview/PremiumSpotlight.tsx`
- `supabase/migrations/<ts>_simplify_monetization_catalog.sql`

**Edited:**
- `src/components/dashboard/overview/OverviewGreeting.tsx` (rewrite)
- `src/components/dashboard/HostDashboard.tsx` (append PremiumSpotlight)
- `src/components/dashboard/ShopperDashboard.tsx` (append PremiumSpotlight)
- `src/lib/monetization/products.ts` (simplified allowlist)
- `src/pages/Pricing.tsx` (one-line definitions, cut deprecated cards)
- `src/components/dashboard/tabs/PromoteUpgradesTab.tsx` (filter to kept slugs)
- `src/components/dashboard/tabs/PremiumToolsTab.tsx` (unlock CTA → upgrade)
- `src/components/monetization/PackagesIntro.tsx` (copy alignment)

## Money logic — untouched

No changes to fees, payouts, entitlement helpers, webhook, checkout functions, or any `monetization_purchases` rows. No user entitlement is revoked. Deactivation only hides deprecated SKUs from new checkout initiation; existing paid access, `host_subscriptions`, and `listing_promotions` rows continue to grant access as before.
