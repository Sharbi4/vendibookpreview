# Vendibook Seller-Focused SEO Expansion

## Goal
Turn Vendibook into the clear "best answer" for sellers of food trucks, food trailers, concession trailers, carts, and mobile kitchens — not just another listing site. Build premium, honest, content-rich SEO pages with smart inventory fallback so no page ever feels empty.

## Scope (in order)

### 1. New seller landing pages
- **/sell-food-truck** — money page. Hero, trust bullets, "Why sellers use Vendibook," "Sell or rent while you wait" (hybrid), "Get discovered" (search/featured/social/matching), listing-quality checklist, secure-transaction section, equipment types, FAQ (12 questions visible on page).
- **/sell-food-trailer** — unique copy focused on trailers (concession, BBQ, coffee, dessert).
- **/sell-concession-trailer** — concession-specific.

Each: unique title/meta, single H1, JSON-LD (Organization + FAQPage + BreadcrumbList), premium Satin Lux design, mobile-first, hero CTAs ("List Your Food Truck Free" / "Browse Food Trucks for Sale").

### 2. Category page improvements
- **/food-trucks-for-sale** — stronger title/meta, category intro, featured-first ordering, seller CTA, internal city/state links.
- **/food-trailers-for-sale** — same treatment, trailer-focused copy.

### 3. State + city SEO pages with smart fallback
- State pages: AZ, TX, FL, GA, NC, OR, CA (`/food-trucks-for-sale/<state-slug>`).
- City pages: Tucson, Phoenix, Houston, Austin, Dallas, San Antonio, Atlanta, Miami, Tampa, Charlotte, Portland, LA — both food-truck and food-trailer variants where requested.

**Smart fallback logic** (critical):
1. Show city listings first under "Food trucks for sale in {City}"
2. If <6 city listings, append "More food trucks and trailers for sale across {State}"
3. If <6 statewide, append "Additional mobile food listings available nationwide"
4. Each section labeled honestly so the page never lies about location.

Each page: unique title/meta/H1, local intro, FAQ, BreadcrumbList + ItemList schema, internal links (state ↔ city ↔ category ↔ sell).

### 4. Individual listing page SEO upgrades
- Title format: `{Name} Food Truck for Sale in {City, State} | Vendibook` (trailer variant for trailers).
- Meta description templating from listing data.
- Add BreadcrumbList + Product/Offer JSON-LD where price/condition/availability exist.
- Descriptive image alt text, canonical URL, breadcrumbs to city/state/category.

### 5. Internal linking
- **Footer SEO section**: Marketplace column with sell pages, category pages, state pages, featured.
- **Homepage seller block**: "Have a food truck to sell?" with two CTAs.
- **Empty search states**: link to sell pages + nearby cities/states.
- **Listing detail**: breadcrumbs + related/nearby links.

### 6. Structured data
- Organization + WebSite (SearchAction) sitewide.
- BreadcrumbList on category/location/listing/blog.
- ItemList on category/location grids.
- Product/Offer on listings when data present.
- FAQPage only where FAQ is visible.
- Article on blog posts.
- No fake reviews/ratings/inventory.

### 7. Sitemap + robots
- Add new sell pages, state pages, city pages to sitemap generator.
- Confirm dashboard/admin/auth excluded (already in robots.txt).
- Canonical/noindex on filtered URLs (`?sort`, `?page`, etc.) to prevent duplicate indexing.

### 8. Blog cluster (lightweight pass)
- Ensure existing blog posts link into the new sell pages. (Won't author 13 new posts in this pass — flag as follow-up.)

## Technical notes

- New route components live in `src/pages/sell/` (`SellFoodTruck.tsx`, `SellFoodTrailer.tsx`, `SellConcessionTrailer.tsx`), registered in `src/App.tsx`.
- State/city pages reuse `CategoryIndex` via `cityCategoryConfigs.ts` extension; the smart fallback (city → state → nationwide) is added inside `CategoryIndex.tsx` as a new query layer that fetches in cascading tiers and renders labeled section headers.
- Listing detail SEO upgrades: edit existing `ListingDetail` SEO block to use new title/meta template and add Product/Offer JSON-LD via existing `JsonLd` component.
- Footer SEO links added in `src/components/layout/Footer.tsx`.
- Homepage seller block added between existing sections in `src/pages/Index.tsx`.
- Sitemap: extend `scripts/generate-sitemaps.ts` (or the equivalent generator) with new static paths; dynamic listing/city URLs already covered.
- All copy uses careful language ("may help match," "optional," "where supported") — no overpromising.
- Design: Satin Lux dark charcoal, orange CTAs, glassmorphism, hairline borders — consistent with current marketplace pages.

## Out of scope (flag as follow-ups)
- Authoring the full 13-post blog cluster (heavy; recommend a separate pass).
- Server-side rendering of meta tags (current `seo-prerender` edge function already covers share routes; expanding it to all SEO pages is a separate infrastructure task).
- Filter-URL canonical rewrites if the existing router doesn't already strip them.

## QA before closing
- All new routes return 200 in preview.
- Sitemap regenerates and includes new paths.
- City fallback verified with Houston (low inventory) — shows TX + nationwide sections.
- JSON-LD validates (manual check via Rich Results Test recommended after publish).
- No new TypeScript or build errors.
- Footer + homepage internal links render and route correctly.
