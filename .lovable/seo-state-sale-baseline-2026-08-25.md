# Phase 3 SEO Baseline — State-Level "For Sale" Pages
Recorded 2026-08-25 before Phase 3 changes. Source: Google Search Console
(28 days ending 2026-08-21, vs prior 28 days) + Semrush + live inventory query.

## Site-level GSC (28d ending 2026-08-21)
- Clicks: 269 (+12 vs prior), Impressions: 14,518 (+2,995, growing), CTR 1.85%, avg position 12.1

## Existing state sale pages (before Phase 3)
| URL | Clicks | Impr | CTR | Pos | Notes |
|---|---|---|---|---|---|
| /food-trucks-for-sale/texas | 7 | 3,841 | 0.18% | 9.0 | Huge impressions, CTR problem |
| /food-trucks-for-sale/arizona | 12 | 687 | 1.75% | 11.4 | Already converting visibility |
| /food-trucks-for-sale/georgia | 6 | 567 | 1.06% | 11.8 | |
| /food-trucks-for-sale/florida, /north-carolina, /oregon, /california | — | low/omitted | — | — | Below GSC reporting threshold |

### Queries of note
- "food truck for sale in texas" — pos 11.1, 104 impr
- "food truck for sale texas" — pos ~9.5
- "food trucks for sale" (national) — pos 11.8, 227 impr
- "food trailer for sale houston" — pos 10.5, 104 impr
- "food truck for sale by owner" — pos ~1
- Texas city queries (Houston/Dallas/Austin/San Antonio) — pos ~31–46

## Architecture before Phase 3
- State TRUCK pages live: AZ, TX, FL, GA, NC, OR, CA (`/food-trucks-for-sale/<state>`)
- State TRAILER pages: none
- City sale pages: Houston/Dallas/Austin/San Antonio TX, Phoenix/Tucson AZ (trucks+trailers), Atlanta GA, Miami/Tampa FL, Charlotte NC, Portland OR, Los Angeles CA
- Flat variants: /food-trucks-for-sale-{houston,phoenix,tucson,atlanta,portland}, /food-trailers-for-sale-houston (kept — own canonicals, pre-existing)
- Breadcrumbs: Home → H1 only (flat, no category/state level)

## Inventory snapshot (published, non-demo, by state)
- TX: 13 trailer-sale, 5 truck-sale | GA: 6 trailer-sale | FL: 4 trailer-sale
- MI: 2 trailer-sale, 0 trucks | AZ: 2 trailer-sale, 0 trucks | OH: 1 trailer-sale, 0 trucks
- Tier 2 signals: CO 3 trucks, TN 2 trailers, IL 2 trucks, WA 1+1

## Phase 3 changes made
- NEW truck state pages: Michigan, Ohio
- NEW trailer state pages: Texas, Georgia, Florida, Michigan, Ohio, Arizona
- Texas truck title → "Food Trucks for Sale in Texas | Used & Owner-Listed | Vendibook" (meta description unchanged per Phase 1/2 CTR work)
- Unique title/description/intro copy for all Tier 1 state+category pages
- Metro link sections on TX (4 cities), AZ (2), GA (1), FL (2) state pages
- Breadcrumbs: Home → National category → State → City (visual + BreadcrumbList schema)
- National hubs (/food-trucks-for-sale, /food-trailers-for-sale) gained "browse by state" sections
- Sitemap: +8 state URLs; Footer By State column: +MI, +OH, +TX trailers
- Tier 2 (IL, TN, OR, WA, CO, NC): architecture is config-driven; NOT publishing new Tier 2 pages (thin inventory)

## Measurement plan
Re-check GSC in 4–6 weeks: state-page CTR (Texas esp. — target ≥1% from 0.18%),
impression growth for MI/OH/trailer pages, and city page movement (Houston/Dallas/Austin/San Antonio from pos 31–46).
