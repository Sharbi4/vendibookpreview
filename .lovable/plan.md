## Problem
- Hero panel image is capped at ~560px width — not full width.
- The "search field" on the image is actually a real `<input>` overlay, but its position percentages were calibrated against a smaller crop (e.g. `visibleBottomPx=1414`). After expanding to the full 1672px native height, the overlay (and CTA hotspots) drifted off the drawn search bar/buttons in the artwork, so it looks fake and unclickable.
- User wants: full width + full bottom height, keep the top crop, and a real working search field.

## Fix (in `src/components/home/hero/panels/MockHeroPanel.tsx` + 4 panel files)

1. **Full width:** Remove `max-w-[480px] sm:max-w-[520px] md:max-w-[560px] px-2 sm:px-0` from the outer wrapper so the panel fills its parent. Keep `rounded-3xl ring-1 ring-white/10 shadow-2xl`.

2. **Full bottom, keep top crop:** Keep `visibleBottomPx=1672` (already full) and `visibleTopPx=150` (keeps mock browser chrome cropped).

3. **Real, prominent search bar — not an overlay on the image:**
   - Remove the in-image `searchOverlay` rendering and the CTA hotspot buttons from `MockHeroPanel` (they no longer align with the artwork and feel fake).
   - Render a real search bar + action buttons **below** the image, inside the same panel container:
     - White pill input with `Search` icon, 16px font on mobile (no iOS zoom), `Enter` submits.
     - Primary "Search" button routes to `/search?q=…&mode=<panel mode>`.
     - Preserve existing analytics: `trackLeadEvent('homepage_search_submit', …)`.
   - Keep the panel-specific secondary CTAs (e.g. "List it free", "Sign up free", "Browse trucks and trailers") as real buttons rendered below the search bar — same labels, hrefs, and event names that are currently passed via the `ctas` prop.

4. **Prop cleanup:** `MockHeroPanel` keeps `imageUrl`, `alt`, `visibleTopPx`, `visibleBottomPx`, `searchOverlay` (now just supplies `placeholder` + `mode`), and `ctas` (now rendered as real buttons, `top/left/width/height` ignored / optional). No call-site signature breakage for Panel1–4.

## Files touched
- `src/components/home/hero/panels/MockHeroPanel.tsx` — width, remove overlays, add real search + CTA stack.
- `src/components/home/hero/panels/Panel1Marketplace.tsx`, `Panel2Financing.tsx`, `Panel3HostTools.tsx`, `Panel4Payments.tsx` — no prop changes required; coordinate fields on CTAs become inert.

## Out of scope
- No changes to hero carousel container, headline, or non-hero sections.
- No new analytics events.