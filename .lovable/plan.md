## Refactor hero so the mockup is background-only and all UI is real

Current bug: each panel renders the mockup image as the entire slide via `MockHeroPanel`, so the search bar and buttons inside the image are fake. The fix is to switch panels to the existing `HeroPanelShell` (which already supports a background image + real headline/CTAs) and add a real search component.

### Files

1. **`src/components/home/hero/panels/Panel1Marketplace.tsx`** — rewrite to use `HeroPanelShell`:
   - `bgImage` = marketplace mock (decorative, `aria-hidden`).
   - Eyebrow: "THE MARKETPLACE FOR MOBILE FOOD ASSETS"
   - Headline: "Find, rent, buy, or sell food trucks and food trailers"
   - Supporting text per spec.
   - Render a new `<HeroSearchForm />` (real `<form>` with input + Search button) as `primaryCta`.
   - Secondary row beneath: "Sign Up Free" → `/auth?mode=signup&...utm`, "Browse Trucks & Trailers" → `/search?category=food_truck,food_trailer&...utm`.
   - "Have a truck or trailer? List it free →" link → `/list?...utm` (closest existing route; add TODO if `/list-your-food-truck` doesn't exist).

2. **`src/components/home/hero/panels/Panel2Financing.tsx`** — use `HeroPanelShell` with financing mock as bg, spec text, CTAs "Browse Eligible Listings" + "Learn How It Works" routing as listed.

3. **`src/components/home/hero/panels/Panel3HostTools.tsx`** — use `HeroPanelShell` with host-tools mock as bg, spec text, CTAs "Explore Host Tools" → `/tools` (TODO note for `/host-tools`), "How Hosting Works" → `/how-it-works-host`.

4. **`src/components/home/hero/panels/Panel4Payments.tsx`** — same pattern: payments mock as bg, spec text, "Learn More" + "Browse Listings" CTAs.

5. **New `src/components/home/hero/panels/HeroSearchForm.tsx`** — real form: white pill input with `Search` icon, `text-base` (16px) on mobile, Enter submits, button labeled "Search". Empty submit → `/search?utm_source=homepage&utm_medium=hero&utm_campaign=homepage_search&utm_content=empty_marketplace_search`; with query → `/search?q={encoded}&...utm_content=marketplace_panel`. Fires `trackLeadEvent('homepage_search_submit', …)`.

6. **`src/components/home/hero/panels/HeroPanelShell.tsx`** — minor tweak: drop fixed `min-h` so the slide grows with content and the carousel dots in `RotatingHero` sit cleanly below without cutting off the bg image. Keep dots in `RotatingHero` (already outside the slide card).

7. **`src/components/home/hero/panels/MockHeroPanel.tsx`** — delete (no longer referenced) via `rm`.

### Routes used (with TODO when no exact match exists)
- `/search?q=…&utm…` and `/search?utm…` (exists)
- `/auth?mode=signup&utm…` (existing signup route) — used in place of `/signup` (TODO note)
- `/list?utm…` (existing) — used in place of `/list-your-food-truck` (TODO note)
- `/how-it-works?utm…` (existing)
- `/tools?utm…` for "Explore Host Tools" (TODO for `/host-tools`)
- `/how-it-works-host?utm…` for "How Hosting Works"

### Out of scope
- No changes to `RotatingHero` rotation/swipe logic, header, or non-hero sections.
- No redesign of other home sections.