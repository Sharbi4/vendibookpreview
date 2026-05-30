
## Goal

Reshape `/` into a focused, premium marketplace for **food trucks and food trailers** — rent, buy, sell, list — with the concierge lead form as the primary soft-conversion path. Strip vendor-space copy, demote the newsletter popup, and tighten every section to earn its place.

---

## 1. Section order (rewrite `src/pages/Index.tsx`)

```
AnnouncementBanner
VerificationBanner (logged-in unverified only — unchanged)
Hero (new)
ListingsSections (Recently Added Trucks & Trailers)
ConciergeSection
TrustInfrastructure
BecomeHostSection (host/seller CTA)
FinalCTA (new copy)
```

Remove from homepage: `PaymentsBanner` (already minor, but consolidated into trust pillars).

---

## 2. Hero — `src/components/home/Hero.tsx` (rebuild)

Replace the current `HeroValueProp` import with a new `HeroFocused` component (build alongside, keep `HeroValueProp` for other pages).

Structure, top-to-bottom, vertically tight (mobile-first, value prop above fold):

- Small wordmark (logo height reduced from `h-20` to `h-10`, no glow halo).
- **Eyebrow** (uppercase tracked): "Food trucks and trailers, easier to find and list"
- **Headline** (3xl → 5xl, balanced): "Find, rent, buy, or sell food trucks and food trailers"
- **Subheadline** (lg, muted): "Vendibook helps food entrepreneurs find available trucks and trailers, compare real listings, check availability, and get help with next steps before they commit."
- **Search row** (reusing `HeroSearchInput` with `useHeroSearch`) + a visible **"Search Listings"** submit button to the right of the input (or stacked on mobile). Wire to `handleAISearch` so Enter, mic, and the new button all behave the same. Fire `homepage_search_submit`.
- **Primary CTA row**:
  - `Tell Vendibook What You Need` — opens `TellVendibookModal` (concierge lead). Fires `homepage_primary_cta_click`.
  - `Browse Trucks & Trailers` — navigates `/search?category=food_truck,food_trailer`. Fires `homepage_browse_click`.
- **Host nudge** (small text link under the CTAs): "Have a truck or trailer? List it free." → `/list`. Fires `homepage_host_list_click`.
- **Fine print** (xs, muted): "Free to browse. No commitment. Listings are subject to owner availability, approval, verification status, and final terms."
- **Trust row** (small chip strip): "Secure payments · Owner profiles · Document collection · Booking requests · Concierge help"
- Replace the 4-pill category strip and `HeroVendiButton` (already redundant with concierge CTA).

Keep `HeroBackground` ambient. Reduce min-height from `92vh` to ~`auto` with `py-12 md:py-20` so CTAs sit higher.

---

## 3. Search submit button — `src/components/home/hero/HeroSearchInput.tsx`

Add a visible right-side submit button labeled "Search Listings" (icon + text on desktop, icon-only fallback at narrow widths). Calls the existing `handleAISearch`. Mic + locate stay, but are visually demoted (ghost icons). Tracks `homepage_search_submit`.

---

## 4. Listings — `src/components/home/ListingsSections.tsx`

Rename header to **"Recently Added Trucks & Trailers"** with sub: "Real listings from verified owners across the US."

Tabs (4):
- For Rent
- For Sale
- Food Trucks
- Food Trailers

No Vendor Spaces tab (already removed in prior turn). Each tab pulls published listings where `category IN ('food_truck','food_trailer')` plus its filter (`mode='rent'`, `mode='sale'`, `category='food_truck'`, `category='food_trailer'`), `Demo%` titles excluded.

Card CTAs (in `src/components/listing/ListingCard.tsx`, already wired to `trackLeadEvent('listing_card_click')` — confirm copy):
- Rent → "Check Availability"
- Sale → "Ask About This Listing"

Add `homepage_listing_card_click` event alongside the existing `listing_card_click` when fired from this section (pass `source: 'home_recently_added'`).

---

## 5. Concierge — `src/components/home/ConciergeSection.tsx`

Rewrite copy:
- Eyebrow: "Concierge"
- Headline: "Get help finding a truck or trailer"
- Body: "Share what you're trying to rent, buy, sell, or list. Vendibook can help confirm availability, pricing, owner details, documents, and next steps."
- Primary CTA: **"Get Help Finding a Truck or Trailer"** → opens `TellVendibookModal` (replaces `TicketFormDialog`/Match Me wiring).
- Trust pills: keep "Free service · Response in 2 hrs · No commitment"

Fire `homepage_concierge_click` on CTA click.

---

## 6. Trust — `src/components/home/TrustInfrastructure.tsx`

Replace headline copy with the brief's precise claim:
- Headline: "Tools that move every deal forward"
- Body: "Vendibook gives buyers, renters, owners, and sellers tools for secure payments, document collection, owner profiles, messaging, and booking requests — so every deal has a clearer path forward."

Replace the "Vendor lots" photo with a second truck/trailer photo (use existing `trustHandoff` or swap with an asset already in `src/assets/home/`). If no second appropriate photo exists, drop to a 2-photo grid (kitchen + handoff) — vendor-lot tile is removed regardless.

Pillars: keep the 9-card grid; no copy changes (already precise).

---

## 7. Final CTA — `src/components/home/FinalCTA.tsx`

Rewrite:
- Headline: "Ready to find or list a food truck or trailer?"
- Body: remove generic line.
- Primary: **"Tell Vendibook What You Need"** → opens `TellVendibookModal`. Fires `homepage_final_cta_click` with `cta: 'concierge'`.
- Secondary: **"Browse Listings"** → `/search`. Fires `homepage_final_cta_click` with `cta: 'browse'`.

---

## 8. Newsletter popup — `src/components/newsletter/NewsletterPopup.tsx`

Suppress on homepage first visits. Implementation:
- Read `useLocation().pathname` — if `/`, do not register the scroll listener at all (component renders null).
- Keep popup behavior on every other route.

No new concierge popup added in this pass (concierge already lives in the page body, the modal, and the final CTA — adding a popup would re-introduce the friction the brief is removing).

---

## 9. Analytics events — `src/lib/leadTracking.ts` + call sites

Register and fire (all via `trackLeadEvent` → `analytics_events` table, GA-optional):

| Event | Where it fires |
|---|---|
| `homepage_primary_cta_click` | Hero "Tell Vendibook" button |
| `homepage_browse_click` | Hero "Browse Trucks & Trailers" |
| `homepage_host_list_click` | Hero host link |
| `homepage_search_submit` | Search submit button + Enter |
| `homepage_listing_card_click` | Recently-Added cards |
| `homepage_concierge_click` | Concierge section CTA |
| `homepage_final_cta_click` | Final CTA (both variants, with `cta` payload) |

Each event includes `route: '/'` and any relevant `source` / `cta` metadata.

---

## 10. SEO

Update `index.html` `<title>` and `<meta name="description">` already done in prior turn; no further changes.

---

## Out of scope (this pass)

- No new pages, no listing card refactor beyond confirming CTA labels and tracking source.
- No changes to vendor-space pages (`/vendor-spaces`, `VendorLotsSection`); they remain reachable, just absent from the homepage.
- No changes to header/nav, footer, or auth flows.
- No new design tokens; reuse `glass-cta`, `dark-shine`, semantic tokens already in the design system.

---

## Technical notes

- All new buttons use existing `Button` variants (`glass-cta` for primary, `outline` for secondary, ghost link for the host nudge).
- All copy lives inside components (no i18n changes needed for this pass).
- `TellVendibookModal` mount: hero + concierge + final CTA all share one instance via local state per section; modal already self-contained.
- Touch any file already in the prior turn's set without re-introducing vendor-space references.
