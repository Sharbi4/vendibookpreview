## Scope

Ship a single `SmartImage` primitive plus card-level `SkeletonCard` and roll them into the highest-traffic image surfaces first (homepage, listing cards, dashboard cards, listing detail). Do NOT touch every `<img>` in the repo (60+); instead cover the ones that render in user viewports and leave a codemod path for the rest. No visual redesign — keep existing sizing, radii, and hover behavior.

## 1. Foundation

**`src/components/ui/SmartImage.tsx`** (new)
- Props: `src`, `alt`, `aspect` (`'video' | 'square' | '4/3' | '3/2' | number`), `sizes?`, `priority?` (boolean, default false), `objectFit?`, `radiusClass?`, `fallback?`, `className?`, plus width/height passthrough.
- Renders `<div class="relative overflow-hidden">` with the aspect ratio pinned by `padding-top` (works pre-JS, matches Tailwind aspect but predictable across browsers). Inside: shimmer skeleton absolute-positioned, then `<img>` absolute-positioned with `object-cover`, `decoding="async"`, `loading={priority ? 'eager' : 'lazy'}`, `fetchPriority={priority ? 'high' : 'auto'}`.
- On `onLoad` / `onError`: fade image in over 250ms via opacity transition; on error render the branded fallback (small flame mark on `bg-muted` — reuse existing `/favicon.svg`-style svg mark inline).
- Skeleton = `.smart-image-shimmer` utility (new, defined in `index.css`) using existing shimmer keyframes with `hsl(var(--muted))` base and `hsl(var(--muted-foreground)/0.08)` sweep.
- No srcset transform pipeline yet (Supabase storage doesn't proxy transforms in this project); instead honor the `sizes` attribute for future readiness and set a sane rendered width via `className`. Cap cards to `max-w-full` so oversized uploads still render into 300–400px slots without CLS.

**`src/index.css`**
- Add `.smart-image-shimmer` (background-image linear gradient, uses existing `@keyframes shimmer`, 1.5s cycle) and `.smart-image-fade-in` (opacity 0 → 1 300ms cubic-bezier ease-out).
- Add `img { max-width: 100%; height: auto; }` sitewide safety (already implicit but make explicit) — no visual change.

**`src/components/ui/SkeletonCard.tsx`** (new)
- Variants: `listing` (4:3 image + 2 title lines + price line), `photo` (aspect-video image + label), `kpi` (small square + 2 lines). Uses `.smart-image-shimmer`. Exact same paddings/radii as the real card components so replacement doesn't reflow.

## 2. Surface adoption (targeted, not exhaustive)

Swap `<img>` for `<SmartImage>` in these files (list only; behavior preserved):

- `src/components/listing/ListingCard.tsx` — card cover (aspect 4/3, priority=false, sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw")
- `src/components/listing/ListingPreviewDrawer.tsx` — hero
- `src/components/dashboard/shared/PhotoListingCard.tsx` — card image
- `src/components/dashboard/shared/EmptyState.tsx` — decorative image
- `src/components/dashboard/overview/RecentActivityStrip.tsx` — activity thumbs
- `src/components/dashboard/tabs/FavoritesTab.tsx` — favorite card image
- `src/components/dashboard/DraftsSection.tsx`, `HostOffersSection.tsx`, `BuyerOffersSection.tsx`, `ListingInsightsPanel.tsx` — row thumbnails (aspect square)
- `src/components/home/HeroWalkthrough.tsx` — hero image (priority=true)
- `src/components/home/PaymentsSection.tsx` — section media

## 3. Grid skeletons

- `src/pages/Browse.tsx` — while `isLoading`, render 8 `<SkeletonCard variant="listing" />` in the same grid classes (same widths → zero reflow when real cards land).
- `src/pages/HostListings.tsx` and `src/components/dashboard/tabs/FavoritesTab.tsx` — same pattern in their loading branches.
- Dashboard `RecentActivityStrip.tsx` — while loading, render 4 `<SkeletonCard variant="photo" />` at strip dimensions.
- Stagger real cards in via a light `.smart-image-fade-in` on the card root (already there via SmartImage on the image; add to card wrapper only where the whole card enters mid-scroll).

## 4. LCP + font

- `index.html` — add `<link rel="preload" as="image" href="{hero image url}" fetchpriority="high">` for the homepage hero (only that one). If the hero is a lazy React import we'll rely on `priority` on `SmartImage` instead — pick the one that's actually rendered above the fold.
- Verify `@font-face` uses `font-display: swap`. If Sofia Pro / Manrope declarations lack it, add it. Add `size-adjust` fallback stack in `body { font-family }` only if measured reflow is visible.

## 5. Verify

- `bunx tsgo --noEmit`
- Playwright at Fast 3G on `/`, `/browse`, `/listing/:id`, `/dashboard`: capture screenshots at 0.5s / 1s / 3s to demonstrate skeleton → image transitions, and read Layout Shift entries via `PerformanceObserver` to record CLS. Report the before/after (before observed from user's screenshot report; after measured).
- Report files changed + CLS numbers per page.

## Files changed (planned)

New: `src/components/ui/SmartImage.tsx`, `src/components/ui/SkeletonCard.tsx`.
Edited: `src/index.css`, `index.html`, plus the 11 surface files listed in §2 and §3.

## Out of scope

- SVG icons, inline logos, QR codes, message-thread avatars, admin dashboards, marketing SEO pages — untouched (they either aren't user-visible perf pain or don't have layout-shift risk).
- No CDN image resizer / responsive srcset backend work (Supabase storage doesn't offer transforms in this project).
- No design or copy changes.
