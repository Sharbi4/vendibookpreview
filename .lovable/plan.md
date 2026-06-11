# Rotating Hero System

Transform the single static hero into a premium 4-panel rotating hero, with a referral promo card and concierge card placed below it. Keep all existing dark/charcoal + orange Vendibook styling, search-first Panel 1, and the current `HeroBackground` aesthetic.

## 1. Hero architecture

Create new files under `src/components/home/hero/`:

- `RotatingHero.tsx` — wrapper. Manages active panel index, auto-rotate timer (8s), pause-on-interaction, swipe (framer-motion drag on mobile), keyboard left/right, and renders progress dots.
- `panels/Panel1Marketplace.tsx` — wraps existing `HeroFocused` content (search-first). Keeps the search bar as the primary action.
- `panels/Panel2Financing.tsx` — "Start with the truck before you commit to ownership". Browse Eligible / Learn How It Works CTAs. Satin orange/red sheen background. Includes Stripe + Affirm + Afterpay logos rendered as monochrome white SVGs with a soft metallic sheen overlay (so we don't ship colored partner brand marks — keeps it on-brand and safer). Fine-print eligibility line.
- `panels/Panel3HostTools.tsx` — "More than listings. Built for food truck hosts." Explore Host Tools / How Hosting Works CTAs. Subtle dashboard-style floating cards (Cleaning workflow, Document collection, Booking requests, Owner-approved rentals).
- `panels/Panel4Payments.tsx` — "Accept payments with more confidence". Learn More / Browse Listings. Lock + card glyphs, secure-checkout floating chips, eligibility fine print.
- `panels/HeroPanelShell.tsx` — shared layout shell so every panel has identical height/padding and the page never jumps. Slot props: eyebrow, headline, supporting text, optional searchBar slot, primary CTA, secondary CTA, fine print, right-side visual slot.

`Hero.tsx` swaps from `HeroFocused` to `RotatingHero`.

### Rotation behavior
- Auto-advance every 8s using `setInterval`, paused when:
  - User clicks a dot, swipes, hovers (desktop), or focuses any CTA inside the hero.
  - `prefers-reduced-motion` is set (no auto-rotate, dots still work).
- Framer-motion `AnimatePresence` with mode="wait", fade + 8px slide.
- Progress dots: 4 small pills, active dot fills with primary orange via a CSS animation tied to the timer; clicking jumps directly.
- Swipe: framer-motion `drag="x"` with `dragConstraints={{ left: 0, right: 0 }}`; threshold ~60px to advance.

### Layout stability
- `HeroPanelShell` uses `min-h-[640px] md:min-h-[560px]` (tuned to current hero) so panel switches don't shift the page.
- On desktop, split layout: text left, visual slot right. On mobile, stacked, visual slot becomes a compact background accent.

## 2. Copy & routes
All copy and route strings come straight from the user's spec (eyebrows, headlines, supporting text, primary/secondary CTAs, UTM params, fine print). No placeholder links.

## 3. Below-the-hero additions

In `src/pages/Index.tsx`, between `<HeroBelowFold />` and `<AnnouncementBanner />`, add:

- `src/components/home/ReferralPromoCard.tsx` — dark card with orange accent glow. "Earn $500 when you refer a buyer", Learn About Referrals / Share a Referral, both to `/referrals` with the spec'd UTMs. Fine print line included.
- Move `<ConciergeSection />` lower (already lower in current layout — keep it after `ListingsSections`). Update its headline/copy to "Not sure what you need yet?" / "Tell Vendibook what you need" CTA pointing to `/concierge` with the spec'd UTMs.

## 4. Analytics

Add `trackLeadEvent` calls (existing helper in `src/lib/leadTracking.ts`) for:
`hero_panel_viewed`, `hero_panel_swiped`, `hero_search_clicked`, `hero_browse_clicked`, `hero_list_it_free_clicked`, `hero_financing_clicked`, `hero_host_tools_clicked`, `hero_payments_clicked`, `referral_card_clicked`, `concierge_card_clicked`.

Each event includes: `panel_name`, `cta_label`, `destination`, `device` (from `useIsMobile`), `user_id` (from `AuthContext`), `timestamp`, and parsed UTM params.

`hero_panel_viewed` fires from `RotatingHero` whenever active index changes.

## 5. Partner logos

- Use the existing `src/assets/stripe-icon.png` (already in repo) for Stripe.
- Generate two new SVG-style monochrome white wordmarks for Affirm + Afterpay via the image-gen tool, saved to `src/assets/affirm-mono.png` and `src/assets/afterpay-mono.png`, displayed at ~24px height with a subtle CSS metallic sheen (linear-gradient mask animation). This avoids shipping the colored brand marks while still signaling the partners. We can swap to official brand assets later if you provide them.

## 6. Mobile/desktop polish
- Mobile: 1 primary + 1 secondary CTA per panel max; bottom padding `pb-24` so the bottom nav + chat bubble never overlap.
- Desktop: richer visuals in the right slot, same 4 messages.
- Keep `HeroBackground` (grid + orange glow) as the base layer for all panels; per-panel accent layers compose on top.

## 7. Files touched

New:
- `src/components/home/hero/RotatingHero.tsx`
- `src/components/home/hero/HeroPanelShell.tsx`
- `src/components/home/hero/panels/Panel1Marketplace.tsx`
- `src/components/home/hero/panels/Panel2Financing.tsx`
- `src/components/home/hero/panels/Panel3HostTools.tsx`
- `src/components/home/hero/panels/Panel4Payments.tsx`
- `src/components/home/ReferralPromoCard.tsx`
- `src/assets/affirm-mono.png`, `src/assets/afterpay-mono.png` (generated)

Edited:
- `src/components/home/Hero.tsx` (point to `RotatingHero`)
- `src/components/home/ConciergeSection.tsx` (copy update)
- `src/pages/Index.tsx` (insert `ReferralPromoCard`)
- `src/lib/leadTracking.ts` (add new event names to allowed list if it has one)

## Out of scope
- No new backend, routes, or schema changes. `/host-tools`, `/how-it-works/hosting`, `/concierge`, `/list-your-food-truck`, `/referrals` are linked as-is — if any don't exist as routes today, they'll 404 until added (flag if you want me to wire fallbacks).
