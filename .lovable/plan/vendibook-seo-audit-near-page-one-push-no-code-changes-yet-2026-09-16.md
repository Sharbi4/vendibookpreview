# Vendibook SEO Audit — Near-Page-One Push (no code changes yet)

Evidence base: live Search Console for https://vendibook.com/ (2026-08-17 → 2026-09-13),
live HTML fetched from vendibook.com today, and the current project files.
Everything below is labelled **Confirmed** (measured/read today) or **Inferred**.

## Headline numbers (Confirmed, Search Console 28d)

306 clicks, 17,138 impressions, CTR 1.79%, avg position 14.1.
Impressions up 3,509 vs the prior 28 days while average position slipped from 11.9 to 14.1 —
i.e. growth is coming from a long tail of new, lower-ranked impressions, not from the money pages falling.

| Page | Clicks | Impressions | CTR | Avg pos |
|---|---|---|---|---|
| / | 65 | 1,179 | 5.5% | 8.3 |
| /sell-food-truck | 46 | 816 | 5.6% | 4.6 |
| /sell-my-food-truck | 42 | 687 | 6.1% | 6.0 |
| /food-trucks-for-sale/texas | 12 | 5,328 | **0.23%** | 8.8 |
| /rent/food-trailers/los-angeles-ca | 10 | 703 | 1.4% | 24.9 |
| /sell-food-trailer | 10 | 131 | 7.6% | 6.4 |
| /rent/food-trailers/houston-tx | 9 | 387 | 2.3% | 11.3 |
| /buy/food-trailers/atlanta-ga | 6 | 211 | 2.8% | 10.4 |

Query snapshot: "food trailer for rent" 95 impressions at pos 15.1 (2 clicks);
"food trucks for sale" 213 impressions at pos 12.5 (2 clicks); "food trucks for sale in texas"
61 impressions at pos 11.3; "sell my food truck" pos 6.3; "used concession trailer" pos 4.6.

## 1. Three site-wide defects found today (Confirmed)

**A. Every URL serves a homepage canonical and the homepage title in raw HTML.**
`index.html` line 23 hardcodes `<link rel="canonical" href="https://vendibook.com/">` and line 17
the generic title. Fetching `/sell-my-food-truck`, `/food-trucks-for-sale/texas`,
`/food-trailers-for-rent` and `/rent/food-trailers/los-angeles-ca` with a Googlebot user agent
returns that same homepage title and homepage canonical. `src/components/SEO.tsx` rewrites both
client-side after render, so JS-executing Googlebot eventually sees the right values — which is why
these pages do rank. But every non-rendering consumer (social crawlers, AI crawlers, the first
crawl pass) is told all 135 sitemap URLs are copies of the homepage. This is the single largest
structural risk on the site and it affects every page discussed below.

**B. `/sell-food-truck` returns HTTP 200, not a 301.**
`public/_redirects` line 2 declares a 301 and `src/App.tsx` line 472 renders a client-side
`<Navigate>`, but a live `curl -I` returns `200`. Google therefore still indexes it as a separate URL
(46 clicks, pos 4.6). It is not in `sitemap_pages.xml`, so it is currently an indexed orphan.

**C. Texas state page has a severe CTR failure, not a ranking failure.**
5,328 impressions at position 8.8 producing 12 clicks (0.23%). Position 8.8 should yield roughly
2–4% — the gap is worth an estimated 100–200 clicks/month on that page alone. Inferred cause: the
title/description Google renders is generic or the snippet lacks inventory count, price range, and
freshness signals.

## 2. /sell-my-food-truck vs /sell-food-truck (analysis only — no change executed)

Confirmed: they are **not** cannibalising in the harmful sense. `/sell-food-truck` is intended to be
a redirect (both a `_redirects` rule and a router `<Navigate>` exist); it simply isn't executing as a
server redirect. They occupy adjacent positions (4.6 and 6.0) on overlapping queries and together
produce 88 clicks — the site's largest non-brand cluster.

Recommendation, staged (nothing executed this turn):
1. First make `/sell-food-truck` a real server 301 to `/sell-my-food-truck`. Its rankings are already
   the stronger of the two (pos 4.6), so the equity should consolidate upward, not downward.
2. Do **not** touch `/sell-food-trailer` or `/sell-concession-trailer` — distinct asset intent,
   7.6% CTR, healthy.
3. Reposition `/sell-my-food-truck` as the single seller hub and let the three long-tail seller
   articles (`/best-place-to-sell-a-food-truck`, `/list-food-truck-for-sale`,
   `/resources/food-truck-selling-faq`) link up into it with exact anchors.

Risk note: because `/sell-food-truck` currently ranks *better*, consolidation should be measured for
4 weeks before any further seller-page changes.

## 3. Location / category template review

Structurally strongest (Confirmed from `CategoryIndex.tsx`): breadcrumbs with BreadcrumbList schema,
FAQPage schema, ItemList schema, related-link blocks, and an auto-noindex when a page has zero
listings (line 312) — a good thin-page guard that already exists.

Weak points:
- **State pages** (`STATE_SALE_SPECS` in `cityCategoryConfigs.ts`): titles/descriptions are fully
  templated, so Texas — a 5,328-impression page — reads the same as Ohio. No price range, no
  inventory count, no metro grid above the fold, no "recently listed" freshness signal.
- **City sale pages** (`CITY_SALE_SPECS`, 16 specs) inherit the same template and share the same FAQ
  block verbatim across every city, only swapping the city name. Duplicate-intent risk if inventory
  is thin.
- **`related` arrays** contain a genuine defect: the city-config block emits a link labelled
  `"… (alt URL)"` pointing at a parallel URL pattern — an internal link that advertises duplication.
- Two parallel URL patterns exist for the same intent: `/food-trucks-for-sale/houston-tx` and
  `/houston/food-trucks-for-sale`. Only one should be canonical and linked.

## 4. Rental intent

Confirmed: "food trailer for rent" has 95 impressions at position 15.1 — the best near-page-one
non-brand opportunity on the site. The national hub `/food-trailers-for-rent` exists, and
`/rent/food-trailers/los-angeles-ca` (703 impressions, pos 24.9) and `/rent/food-trailers/houston-tx`
(387, pos 11.3) already carry the city intent.

"food truck for rent monthly" (20 impressions, pos 13.4) has **no page that owns monthly intent** —
it is a single FAQ answer inside `/food-trucks-for-rent`. No new page needed yet; promote monthly
terms into that hub's H2/intro/FAQ first and only build a dedicated page if impressions grow.

## 5. Closest to breaking into the top 10

| Rank | Page | Now | Basis |
|---|---|---|---|
| 1 | /food-trucks-for-sale/texas | pos 8.8, 0.23% CTR | Confirmed — already top 10, CTR is the whole problem |
| 2 | /food-trailers-for-rent (+ hub) | "food trailer for rent" pos 15.1 | Confirmed query, Inferred page attribution |
| 3 | /rent/food-trailers/houston-tx | pos 11.3, 387 impr | Confirmed |
| 4 | /buy/food-trailers/atlanta-ga | pos 10.4, 211 impr | Confirmed |
| 5 | /food-trucks-for-sale | "food trucks for sale" pos 12.5, 213 impr | Confirmed query, Inferred page |
| 6 | /rent/food-trailers/los-angeles-ca | pos 24.9, 703 impr | Confirmed — high volume, furthest away |
| 7 | /food-trailers-for-sale (+ /texas) | "used concession trailer" pos 4.6 | Confirmed query, Inferred page |

## 6. Prioritised action plan

### Tier 1 — now (highest impact, lowest risk)
1. Ship per-route title/description/canonical in the served HTML, or at minimum remove the
   hardcoded homepage canonical from `index.html` so no page falsely declares itself a homepage copy.
2. Make `/sell-food-truck` a genuine server 301 to `/sell-my-food-truck`.
3. Rewrite Texas page metadata with live signals: inventory count, price range, metros, and a
   description written for clicks rather than keywords. Same treatment for the other Tier 1 states.
4. Add a real inventory + price-range module and a metro link grid above the fold on state pages.
5. Promote "monthly", "weekly", "daily" rental terms into `/food-trucks-for-rent` headings and intro.
6. Strengthen `/food-trailers-for-rent`: city link grid to LA / Houston / Miami / Atlanta, rate-range
   block, rental-specific FAQs.

### Tier 2 — second wave
7. Remove the `(alt URL)` related links and pick one canonical URL pattern per city intent.
8. Differentiate city FAQ blocks so they are not identical across all 16 city sale pages.
9. Internal-link pass: seller articles → `/sell-my-food-truck`; state pages → their metros and back;
   buy pages → matching rent pages with exact anchors.
10. Add `/sell-food-truck` handling and any newly promoted pages to `sitemap_pages.xml`, and drop the
    blanket 2026-04-20 lastmod values that no longer reflect real changes.
11. Wire PricePilot and `/food-truck-prices` into the sale pages as a valuation CTA for sellers who
    land on buy-intent pages.

### Tier 3 — only after the above are measured (4+ weeks)
12. New state pages for the next demand tier, once Texas proves the improved template.
13. A dedicated monthly-rental page, only if "food truck for rent monthly" impressions keep rising.
14. Specialty rental hubs mirroring the existing specialty sale hubs.

## 7. Files I would change in the first pass (not edited)

- `index.html` — remove the hardcoded homepage canonical; per-route head handling
- `src/components/SEO.tsx` — canonical/robots emission
- `public/_redirects` + `src/App.tsx` (line ~472) — real 301 for `/sell-food-truck`
- `src/data/cityCategoryConfigs.ts` — state/city titles, descriptions, FAQs, `related` cleanup
- `src/data/categoryIndexConfigs.ts` — `/food-trucks-for-rent` and `/food-trailers-for-rent` copy
- `src/pages/CategoryIndex.tsx` — inventory count / price range / metro grid module
- `src/pages/CategoryCityPage.tsx` — rental city page content depth
- `src/pages/SellMyFoodTruck.tsx` — hub positioning and internal links
- `public/sitemap_pages.xml` — coverage and lastmod hygiene

## Open question before I build

Tier 1 item 1 is the big one. Fixing per-route canonicals properly in served HTML needs
server-side rendering; the quick version is removing the false homepage canonical from `index.html`
and relying on the existing client-side rewrite. Tell me which you want and I'll scope it in.
