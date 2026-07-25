
# Tools + Product Pages — Full Funnel Verification and Polish

Acceptance layer for the earlier tools/feature-page passes. Deliverable is (a) a link-integrity table, (b) per-product pass/fail, (c) consistency fixes that make every surface read from one source of truth. Money, entitlement, and webhook logic are OUT OF SCOPE — copy, links, price display, and routing only.

## Scope — surfaces in the graph

- `/pricing` and `/plans` (Pricing.tsx → PremiumPlansSection, PlansComparisonTable, PlansFAQ, PackagesIntro, ProWeeklyPassCard, tier learn-more overlays)
- `/host/plans` (HostProPlans.tsx)
- Feature pages under `/tools/*` and `/plans/tools/:slug` (PricePilot, PermitPath, BuildKit, ListingStudio, ConceptLab, MarketRadar, MarketingStudio, StartupGuide, RegulationsHub, ToolPreview)
- `/tools` (ToolsIndex) and `/tools/permitpath/upgrades`
- Dashboard: `PremiumToolsTab`, `MembershipTab`, `PremiumSpotlight`, `SidebarUpgradeCard`, `GoProButton`, promote/upgrade cards, `ActionRequiredStack`
- Post-purchase: `PaymentSuccess`, `Purchases`, `UnlockedConfirmation`, `PostPurchaseShare`
- Subscription email templates that link back into the app

## Method

### Phase 1 — Static crawl (no browser needed)
1. Read every surface file above.
2. Extract every `href`, `to`, `navigate(...)`, and `window.location` target reachable from those files.
3. Build the route table from `App.tsx` and cross-check: OK / BROKEN (no matching route, `#`, empty) / STALE (points at a legacy path that now redirects or 404s).
4. Extract every price string and tool name literal; compare to `TIER_CATALOG`, `learnMoreCatalog`, `toolCatalog`, and live `monetization_products` (query DB once for `slug, name, base_price_cents, billing_type, active` where `active=true`).

### Phase 2 — Fix broken/stale links
- Rewrite any hardcoded literal price to read from the product config (or `useMonetizationProducts` where the surface can afford a hook).
- Replace stale hrefs with the current route.
- Any dead `href="#"` gets either a real target, an overlay opener, or is removed.

### Phase 3 — Feature-page quality bar (per tool page)
For each `/tools/*` page and matching `/plans/tools/:slug` (if it exists):
- Hero line is outcome-first, not feature-first.
- 3-step how-it-works matches the shipped tool's actual flow (verified by reading the tool component).
- Price line = live Stripe amount from product config (no hardcoded cents).
- "Free with Pro/Growth/Operator" anchor uses the correct current tier name.
- FAQ links resolve.
- Section rhythm (`.section-stack`, `.section-divider`), 1.5px cream borders, Sofia Pro Soft display / Manrope UI.
- Screenshot references point at files that exist in `src/assets/`.
- Mobile passes at 375px.

Flag any claim that isn't backed by shipped capability — cut it or soften; do not invent new capability.

### Phase 4 — Cross-consistency (single source of truth)
Where the same product appears in multiple surfaces, resolve everything through the shared config:
- `TIER_CATALOG` (host subs) + `useMonetizationProducts` for live price.
- `toolCatalog` for tool name, slug, price, and included tier.
- `learnMoreCatalog` for overlay copy.
Delete duplicated literal names/prices in surface components; import from config. Where a live-price lookup isn't available (emails, static blog), keep the literal but wire it to a shared constant.

### Phase 5 — Report
Emit three tables in the final message:
1. Link integrity: `source → target | status | fix`.
2. Per-product funnel: `product | discover | learn | buy | access | in-tool links | notes`.
3. Consistency fixes: `field | surfaces normalized | source of truth`.
Then run typecheck.

## Out of scope

- Stripe money changes, webhook, entitlement engine, terms gate.
- Redesigns beyond token/rhythm compliance.
- New tools or new copy inventing new capability.
- Backend function edits (unless a link points at a nonexistent function name).

## Deliverables checklist

- [ ] Zero `href="#"` or dead `to=""` on any product-adjacent surface.
- [ ] Every price string on product surfaces sourced from config or live product query.
- [ ] Every "free with X" mention names a tier that currently exists (Starter / Growth / Operator; no lingering Pro/Premium).
- [ ] Every tool feature page's 3-step matches the shipped tool.
- [ ] Typecheck clean.
