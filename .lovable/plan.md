
# Premium Mobile Listing Detail Redesign (For-Sale)

Rebuild the mobile listing page for **sale** listings (food trucks / food trailers) to match the attached Vendibook mockups: premium dark marketplace, warm bronze gradients, glassy cards, generous spacing, conversion-focused CTAs. Desktop layout (sticky right-column purchase widget) stays as-is. Rental listings stay on the current layout.

## Scope

- Only the for-sale rendering path (`listing.mode === 'sale'`) on mobile + tablet.
- All data sourced from the existing `listing`, `host`, and `ratingData` queries — no fabricated reviews, verification, or seller photos.
- Desktop ≥ lg: keep current two-column layout with sticky BookingWidget, just inherit the new section card styling.

## Architecture

Inside `src/pages/ListingDetail.tsx`, when `!isRental`, render a new `<SaleListingMobile>` view as the mobile/tablet layout, and keep the current grid for `lg:` and up. New components live under `src/components/listing-detail/sale/`:

```text
sale/
  SaleListingMobile.tsx        // top-level orchestrator (mobile + tablet)
  SaleBreadcrumb.tsx           // Home > For Sale > {Category} > {Title}
  SaleHero.tsx                 // gallery + title + subtitle + price + status + badges + share/save
  SaleBadgeRow.tsx             // In stock / Pickup only / Category / Featured / Verified Seller
  SaleTrustStrip.tsx           // "Buy with confidence" 3-up bronze-gradient card
  SaleConciergeCard.tsx        // "Want help with this listing?" w/ Check Availability + Ask Vendibook
  SaleMessageSellerCard.tsx    // Pre-filled inquiry card with Send Message
  SaleSellerSummary.tsx        // Sold by + Responds + New seller + Selling since
  SaleMeetYourSeller.tsx       // Avatar + verification checklist (only true items)
  SaleSpecsGrid.tsx            // 2-col icon spec cards
  SalePolicyCard.tsx           // Pickup & Transfer, Return Policy, Pickup Available rows
  SaleLocationCard.tsx         // "Where you'll be" map (reuse ListingLocationMap) with fallback design
  SaleAboutCard.tsx            // About + AudioListingPlayer + PromoVideoPlayer + description
  SaleWhatsIncluded.tsx        // grouped amenity categories with icons
  SalePricingCard.tsx          // Big price + sale policy
  SaleReviewsCard.tsx          // "No reviews yet" empty state or list
  SaleSimilarListings.tsx      // 2-col grid wrapper over RelatedListings data
  SalePurchaseProtection.tsx   // 4 multi-color trust cards
  SaleBrowseMore.tsx           // Row links with chevrons
  SaleStickyActionBar.tsx      // Buy Now + Make Offer (replaces StickyMobileCTA for sale)
```

Shared visual primitive: `SaleCard` (rounded-2xl, `bg-card/60 backdrop-blur`, hairline border `border-white/5`, optional bronze gradient overlay). Used by every section so we replace divider lines with card separation.

## Section-by-section behavior

### Header & breadcrumb
- Keep global `<Header />` (sticky glass). Add `SaleBreadcrumb` directly under it: `Home › For Sale › {CategoryLabel}s › {Title}`, current crumb in `text-primary`, no heavy divider, contained in a subtle card-area.

### Hero gallery
- Reuse `EnhancedPhotoGallery` but wrap in a `rounded-2xl ring-1 ring-primary/20 shadow-[0_0_40px_-12px_hsl(var(--primary)/0.25)]` frame.
- Top-left: `Featured` pill (only when `is_featured`). Top-right: image counter pill `n / total` from gallery state. Hide arrows + dots when only 1 image.

### Listing hero block
- Title (`text-2xl font-semibold`), subtitle from `headline`/short description, location + active dot row, price aligned right on a flex row. `Share` + `Save` as pill buttons next to title (use existing `handleShare`, `FavoriteButton variant="pill"` new variant).
- Removes the current "Share & earn a referral reward →" inline text (moves it into the share menu only, never inline).

### Badge row
- Horizontal scroll-safe flex with `flex-wrap`: In stock (green), Pickup only (icon), Category, Active 1w ago, Featured, Verified Seller (only if `host.identity_verified`). All pill chips, no vertical stacking.

### Trust strip ("Buy with confidence")
- One card with subtle bronze radial gradient. 3-up icons: Verified Listing, Secure Payments, Responsive Seller. Mobile = 3 across with small icons stacked above label.

### Primary purchase actions (mobile)
- Inline `Buy Now` (orange gradient) + `Make Offer` (outline) row at the top of content, then `Check Availability` cream pill, then `Ask Vendibook for Help` dark outline. Also a sticky bottom bar (see Sticky bar section).

### Concierge card
- Bronze-gradient glass card, headset icon, headline, body, two buttons (Check Availability → opens existing `ListingConciergeBox` modal flow; Ask Vendibook for Help → dispatches `start-vendi-call` event per Vendi trigger pattern). Trust note "Replies within 1 business hour · No commitment".

### Message seller card
- Wraps existing `MessageHostForm` logic in the new card chrome. Header "Send a message to {sellerFirstName}", Secure & private label, textarea with character count `n/500`, large orange `Send Message`. Pre-fill: `Hi {firstName}, I'm interested in your {categoryLabel.toLowerCase()} and would love to learn more.`

### Seller summary + Meet your seller
- Summary strip card: Sold by · {Name} · Responds quickly (from `host.last_active_at`) · New seller (only when `ratingData.count === 0`) · Selling on Vendibook since {year of `host.created_at`}.
- Meet your seller card: avatar (`host.avatar_url` else initials), name, location, rating only if `ratingData.count > 0`, verification checklist where each row only renders when underlying boolean is true (`email_verified`, `phone_verified`, `identity_verified`, `vendishield_protected`). If none verified, show generic "Verification in progress" instead of fake checkmarks.

### Technical specs grid
- New 2-col card grid using existing spec fields (Hot/Cold Water from amenities, Category, Condition, Listing Type, Brand, Pickup type, Location, Year if exists). Each cell: orange icon left, label muted, value bold. Skip cells with no data.

### Policy card
- Three rows in one card: Pickup & Transfer, Return Policy, Pickup Available (with city + small map illustration on the right). Each row has icon, title, body, chevron (Pickup/Return open inline collapse, Pickup-available opens directions).

### Location section
- Render approximate-area map via existing `ListingLocationMap` (already supports 800m approximation per location-privacy memory). Wrap in `SaleCard` with title "Where you'll be", `Approximate area` pill, "Exact location provided after purchase confirmation", `View larger map` ghost button. If map fails to load, render the designed fallback card (no "Map unavailable" box).

### About this listing
- Section header + existing `PromoVideoPlayer` (Auto-generate promo video) button on the right. `AudioListingPlayer` in its own bronze-bordered card. `CollapsibleDescription` for the actual description text, increased `leading-relaxed`.

### What's included
- Group `listing.amenities` into Utilities / Kitchen / Cold Storage / Build & Service / Cleaning & Safety using a static amenity→group map (extend the one in `AmenitiesSection`). Each group is its own subsection with a small header, items rendered as rounded icon chips, 2-col on mobile.

### Pricing card
- Dedicated card with bronze gradient inside; large `$X,XXX` + `USD`, "All sales are final after confirmation" note. Sourced from `listing.price_sale`.

### Reviews
- Empty state matches mockup when `ratingData.count === 0`: card with star icon, "No reviews yet", "Be the first to review this listing." button. Real reviews via existing `ReviewsSection` when present.

### Similar listings
- Wrap existing `RelatedListings` data fetch in a 2-col mobile grid renderer. Each card: image, heart, title, location, price, In stock pill. Title "Similar {CategoryLabel}s near {city}" + `View all →` link to `/search?category=...&mode=sale&near={city}`.

### Purchase protection
- Four cards with mixed accent colors: Verified Users (green), Secure Payments (orange), Document Workflow (blue), Dispute Support (gold). 2-col on mobile.

### Browse more
- Stacked rows with icon + label + chevron linking to the eight URLs listed in the brief.

### Footer
- Keep existing `<Footer />`. No structural changes (the brief's footer requirements already match it).

## Sticky bottom bar + chat widget fix

- New `SaleStickyActionBar` replaces `StickyMobileCTA` only when `!isRental`: dark glass background, safe-area inset padding, `Buy Now` (orange) + `Make Offer` (outline) side-by-side, full width.
- Page wrapper gets `pb-[calc(env(safe-area-inset-bottom)+96px)]` on mobile so content scrolls clear of the bar.
- Vendi chat bubble: read its global positioner and offset upward by the sticky bar height on this route (publish a `data-sale-cta-active` attribute on `body` and update the chat widget CSS to respect `bottom: calc(96px + env(safe-area-inset-bottom) + 16px)` when present). No covering of Buy Now / Make Offer.

## Theming tokens

Add to `src/index.css` (HSL semantic tokens, no hardcoded colors in components):

- `--surface-charcoal: 240 6% 8%`
- `--surface-blueblack: 222 22% 9%`
- `--surface-warm: 24 10% 10%`
- `--gradient-bronze: radial-gradient(120% 80% at 100% 0%, hsl(28 70% 45% / 0.25), transparent 60%)`
- `--gradient-bronze-soft: linear-gradient(135deg, hsl(28 70% 30% / 0.18), hsl(240 8% 8% / 0))`
- `--ring-bronze: 0 0 0 1px hsl(28 60% 40% / 0.35)`
- `--shadow-glow-orange: 0 0 40px -12px hsl(var(--primary) / 0.35)`

`SaleCard` consumes these via Tailwind utilities mapped in `tailwind.config.ts` (`bg-surface-charcoal`, `bg-gradient-bronze`, `ring-bronze`, `shadow-glow-orange`).

## Data integrity rules

- Verification checklist items each gated on the matching `host.*_verified` boolean. None faked.
- Seller avatar: only render `host.avatar_url` if present; else initials avatar with bronze ring.
- Reviews: only show stars/count when `ratingData.count > 0`.
- Map: only render with `latitude` + `longitude`; else fallback design card.
- Featured badge: only when `listing.is_featured`.
- Pickup-only / In-stock pills derived from `fulfillment_type` and `status === 'published'`.

## Technical details

- Branch the render in `ListingDetail.tsx`: when `!isRental`, return `<SaleListingMobile {...props} />` for `<lg` screens (via Tailwind `lg:hidden` wrapper) and keep the existing grid inside `hidden lg:block`. The lg grid reuses the same new card primitives for visual parity.
- Lift `images`, `videos`, `locationShort`, `categoryLabel`, etc. into the new component via props so we don't duplicate queries.
- No DB changes, no edge-function changes.
- Honor existing Vendi triggers (`start-vendi-call`), referral, share-kit, and analytics events already wired in `ListingDetail`.
- Mobile input font-size remains 16px (per core memory).

## Out of scope

- Rental listing layout (unchanged).
- Auth, payments, edge functions, schema, SEO/JSON-LD (kept as-is).
- Header redesign beyond inheriting current sticky glass styling.

## Acceptance

- Visiting a published `mode=sale` listing on mobile renders the new layout matching mockups 1–4 in order: gallery → hero+badges → trust strip → buy/offer → concierge → message seller → seller summary → meet seller → specs → policy → location → about → what's included → pricing → reviews → similar → purchase protection → browse more → footer.
- Sticky bottom bar shows Buy Now + Make Offer, never overlaps content or chat widget.
- No fabricated reviews, verification, or seller photos.
- Page remains dark; no light-theme regressions.
- Desktop ≥ lg unchanged in layout but inherits new card visuals.
