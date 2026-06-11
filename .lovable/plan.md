# Simplify Homepage Hero (Mobile-First)

Reduce the first mobile viewport to: nav → category pill → headline → short supporting text → search bar → one host link. Move everything else below the hero. Preserve dark theme, orange accents, typography, rounded UI, and routes.

## Scope

Files to edit:
- `src/pages/Index.tsx` — reorder sections; move `AnnouncementBanner` below the hero.
- `src/components/home/hero/HeroFocused.tsx` — slim down the mobile hero.
- (No changes to header, footer, bottom nav, chat bubble logic, or routes.)

## Changes

### 1. `src/pages/Index.tsx`
- Remove `<AnnouncementBanner />` from above the hero.
- Insert a new section below the hero containing:
  1. A compact "Tell Vendibook What You Need" card (opens existing `TellVendibookModal`)
  2. A "Browse Trucks & Trailers" link/button → `/search?category=food_truck%2Cfood_trailer`
  3. The trust strip (Secure payments · Owner profiles · …)
  4. The disclaimer line ("Free to browse. No commitment…")
  5. `<AnnouncementBanner />` rendered as a small update card
- Keep all existing lazy sections (`ListingsSections`, `ConciergeSection`, etc.) in their current order after this.

### 2. `src/components/home/hero/HeroFocused.tsx`
Mobile (default) hero contents, in order:
1. Category pill (compact: smaller padding, same orange dot)
2. H1 headline — unchanged copy, keep orange gradient on "trucks and food trailers"
3. Supporting text — replace with: *"Search real food trucks and trailers, compare listings, and connect with owners before you commit."*
4. `HeroSearchInput` — unchanged, remains primary CTA
5. Single host link: *"Have a truck or trailer? List it free →"* → `/list` (existing `handleHostList`)

Remove from the mobile hero (keep code only where it's reused on desktop):
- Large centered `vendibookLogo` image → `hidden md:block` so desktop still shows it.
- Primary CTA row (`Tell Vendibook What You Need` + `Browse Trucks & Trailers`) → `hidden md:flex` so desktop keeps them; the mobile equivalents live in the new section below the hero.
- Fine-print disclaimer paragraph → removed from hero (now lives below the hero).
- `TRUST_BITS` strip → removed from hero (now lives below the hero).

Spacing:
- Reduce hero vertical padding on mobile (e.g. `py-8 sm:py-12`) so the search bar lands within the first viewport.
- Add bottom padding to the page so the floating chat bubble and mobile bottom nav don't overlap the host link.

### 3. Floating chat bubble
- No logic change. Verify `FloatingConciergeButton` bottom offset clears the mobile bottom nav and the new "List it free" link. If overlap is found in preview, bump its `bottom-*` class.

## Desktop behavior
- Desktop hero retains the logo, both primary CTAs, trust strip, and fine print (via `md:` visibility classes). Only the announcement bar moves for everyone.

## Non-goals
- No color, font, gradient, logo, or route changes.
- No backend, analytics-event, or modal-behavior changes.
- `HeroRentalSearch.tsx` is not the active hero (Index uses `Hero` → `HeroFocused`); leave it alone.

## Verification
- Preview at mobile (390×844): confirm pill, headline, supporting text, search, and "List it free" all fit above the fold; no chat-bubble overlap.
- Preview at desktop (1440): confirm logo, both CTAs, trust strip, and fine print still render.
- Click-through: `/list`, `/search?category=…`, and Tell Vendibook modal still work.
