# Marketplace Discovery Audit + Recommended Fix Scope

Audit of the browse/search discovery flow. All findings verified against live code. No code changed yet — implementation scope at the end awaits approval.

## 1. Entry points / default mode

**`/search` itself defaults correctly to ALL inventory** — `Search.tsx:89` (`searchParams.get('mode') ... || 'all'`), and only sends a mode filter when one is chosen (`:179`).

Neutral entry points (no mode param → all): header search submit `Header.tsx:234`, header search pill `:414`, AppDropdownMenu `:123/:159`, MobileMenu `:148/:283`, MobileBottomNav `:37`, Browse page `Browse.tsx:66/:107–125/:203/:257`, category tiles `CategoryCarousels.tsx:127`, `DiscoveryGrid.tsx:34–68`, `CategoryGuide.tsx:47–100`, footer "All Listings" `Footer.tsx:41`, all hero search bars.

**Defect A — hero AI search forces rentals:**
- `useHeroSearch.ts:145` — submitting the hero AI search box **empty** navigates to `/search?mode=rent`.
- `useHeroSearch.ts:159` + `supabase/functions/ai-search-parse/index.ts:40,58,95` — the parser's schema only allows `"rent"|"sale"` and its prompt says *"default rent if ambiguous"*; the client then maps anything-not-sale to rent. **Every ambiguous shopper query lands on For Rent.** This is the systemic rental-default bug.

Intentional (labeled) mode links are fine: `HeroSearchFirst.tsx:81` pills, `HeroPopularSearches.tsx:34`, `ListingsSections.tsx:34/39` ("Recent — For Rent/For Sale" rows).

**Defect B — dead param:** `explainers.ts:168` links to `/browse?mode=rent`, but `Browse.tsx` never reads query params — the mode is silently dropped.

## 2. Sorting

**Contract:** `sort_by: newest | price_low | price_high | distance | relevance`, default `newest` (`search-listings/index.ts:50,86,403–441`). Sorting is in-memory after a full fetch.

**The `price_low` vs `price-low` mismatch you spotted is NOT a live defect in the main path** — `Search.tsx:196` maps hyphenated UI state to snake_case before sending (`price-low` → `price_low`), and both selects use hyphenated values (`Search.tsx:810–811`, `MobileStickyBar.tsx:15`). **But there is a URL-contract bug:** `Search.tsx:96` reads `?sort=` raw into hyphenated-typed state — a shared/refreshed link with `?sort=price_low` (snake_case) produces an invalid select value (blank dropdown) and only works by accident. Normalize on read.

**Defect C — featured pins break explicit sorts:** `featuredTiebreak` (`search-listings:395–400`) is the PRIMARY comparator in every sort branch including `price_low`, `price_high`, and `distance` (`:406,414,421,429,438`). Featured listings pin above all others, and within the featured cohort order is a daily hash rotation (`:389–394`) — not the requested sort. **"Price: Low → High" does not actually sort by price.** This matches your suspicion: it is misleading on explicit sorts.

**Caveat:** in `all` mode, price sorts compare `$/day` rentals against full sale prices (`:415–416`) — a $45/day rental sorts "cheaper" than a $4,000 trailer.

**Recommended model:** default sort = **"Recommended"** (current featured-first + newest behavior, honestly labeled). Explicit sorts (price/distance) are honored **strictly**, with featured inventory shown in a clearly labeled **"Sponsored"** group above the sorted results. Price sort in `all` mode gets a clarifying label or is only offered in single-mode views.

## 3. Filters

Backend accepts 17 params (`search-listings:30–51`); `Search.tsx:177–197` sends all of them — nothing unwired at the contract level.

UI inventory: desktop sticky sidebar (`Search.tsx:824+`) and mobile filter sheet expose mode, category, location, radius (5–250 mi), date range, price range, fulfillment-type chips, "delivers to my location" (correctly disabled without location, `:1525`), instant book, verified hosts, featured (`FilterPanel.tsx:209`).

Issues found:
- **No stale Stripe copy in any filter UI** — the only "stripe" reference is a code comment in `QuickBookingModal.tsx:312` (invisible to users). The verified filter is Plaid-era clean.
- Date-range filter is only meaningful for rentals but is surfaced regardless of mode (confirm in implementation; cheapest fix is hiding it in `sale` mode).
- Price filter in `all` mode inherits the same per-day-vs-full-price ambiguity as sorting.
- **URL persistence gaps:** price range, amenities, and the delivery toggle are NOT read from/restored to the URL (`Search.tsx:113,119–120`) — refreshing or sharing a link silently drops them.

## 4. Location / surrounding areas

**How it works today:** no server-side geocoding. The client geocodes the query via `geocode-location` (`Search.tsx:140–160`) and writes `lat/lng/radius/location` into the URL. Backend applies a bounding-box prefilter then exact Haversine cutoff (`search-listings:209–219, 296–331`). Default radius is **100 miles on both ends** (`Search.tsx:112`, `search-listings:72`). Plain `/search` with no location uses **no geolocation** anywhere — it's a national browse.

**Defect D — the biggest discovery bug:** after geocoding, the raw query text is **still sent** alongside coordinates (`Search.tsx:178`). The backend then applies BOTH the city name ILIKE filter (`search-listings:152–174`) AND the radius filter (`:326–331`). So "Austin, TX" matches only listings whose city/address/title literally contain "Austin" AND are within radius — **Round Rock, Cedar Park, etc. are silently excluded.** Houston alone is special-cased with a suburb inclusion list (`houstonSearchArea.ts`); every other metro gets the broken behavior. This directly defeats surrounding-area discovery.

**Radius recommendation:** your instinct is right for a sparse marketplace — **50-mile default when a location is set, with automatic widening**: if a location search returns fewer than ~8 results at 50 mi, re-run at 100 mi and label it ("Expanded to 100 miles — limited inventory near Austin"). Keep 5–250 mi manual override chips. This keeps dense metros relevant while sparse markets still surface inventory.

## 5. Results UX

- **Sort control today:** a small 12px native `<select>` buried in the toolbar next to the view toggle (`Search.tsx:802–815`); on mobile it lives inside `MobileStickyBar`. Functional but low-prominence. **Recommend** a clearly labeled "Sort: Recommended ▾" button directly above the results list, separate from the Filters button, on both desktop and mobile.
- **Radius communication:** the results header shows only "{count} listings" (`Search.tsx:757–758`) — no location or radius context. **Recommend** "N listings within 50 mi of Houston, TX" plus one-tap radius chips.
- **Default view:** `list` (`Search.tsx:132`), with grid/split/map toggles (`:781–799`). Fine.
- **Featured identification:** cards DO render a featured badge (`ListingCard.tsx:179–180` via `isListingFeatured`). Good — keep it, and it becomes the visual anchor for the Sponsored group.

## 6. Recommended implementation scope (smallest safe pass)

1. **Kill rental defaults** — `useHeroSearch.ts:145` → plain `/search`; `ai-search-parse` returns `mode: null` when ambiguous and `useHeroSearch.ts:159` only sets mode on explicit rent/sale; point `explainers.ts:168` at `/search?mode=rent`.
2. **Fix the location double-filter (Defect D)** — when lat/lng are present and the query is the geocoded location, suppress the text ILIKE in `search-listings` (e.g. client sends `location_scoped: true`, backend skips the text branch). Keep Houston's suburb list as a harmless no-op afterward, or remove it.
3. **Honest sorting (Defect C)** — strict price/distance sorts; featured becomes a labeled "Sponsored" group above sorted results; rename default sort to "Recommended"; normalize `?sort=` URL values.
4. **Radius UX** — "within X mi of Y" label + radius chips; 50-mi default with auto-expand-to-100 on sparse results (labeled when expanded).
5. **Small polish** — persist price/amenities/delivery to URL; hide date filter in sale mode; fix `Browse.tsx` mode param.

## QA matrix

- Direct `/search` (no params) → all inventory, sort "Recommended", no geo filter
- Hero search: empty submit → `/search` (all); ambiguous query ("food trailer") → all; explicit "buy"/"rent" → correct mode
- Browse → category tiles → `/search?category=…` keeps mode=all
- Houston, Austin, Atlanta searches → suburbs inside radius appear (regression test for Defect D)
- Sparse-market search → auto-expand label appears; radius chips switch 5/25/50/100/250
- Price Low→High / High→Low → strict numeric order below the Sponsored group; `?sort=price_low` (snake) and `?sort=price-low` both work after refresh
- Distance sort → nearest first, sponsored group labeled
- Featured cards badged in both default and explicit sorts
- URL persistence: refresh + shared link restores mode, category, location, radius, dates, price, amenities, delivery, sort, page
- Mobile: sort control above results, filter sheet opens, inputs stay 16px (no iOS zoom)
