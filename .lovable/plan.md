# Entitlement Audit — Simplified Catalog

Full matrix from the code investigation. For each MISSING/PARTIAL line I recommend either **BUILD now** (fits under a day) or **SOFTEN copy** (remove the unbacked claim). Notary excluded per instructions.

## Matrix

| Package | Benefit line | Delivering feature | Status | Action |
|---|---|---|---|---|
| Free | List free, unlimited inquiries, free e-signatures | Listing CRUD + messaging + TrustESignChip | WORKS | — |
| All | Payment protection at checkout | `create-checkout` + Stripe | WORKS | — |
| Starter | AI listing description generator | `ai-listing-creator` (server tier gate confirmed) | WORKS | — |
| Starter | Booking calendar + inquiry mgmt | `HostBookings.tsx`, `AvailabilityCalendar.tsx` — no gate | Free-for-all | **SOFTEN** — reframe as "included from Free" |
| Starter | Basic analytics | `HostAnalytics.tsx` base charts | WORKS (open) | — |
| Starter | Priority email support | No priority mechanism | MISSING | **BUILD** priority flag on support_tickets + badge |
| Starter | Enhanced listing tools (extra photos, badges) | No tier check on photo count | MISSING | **SOFTEN** — remove; every tier has same photo/badge caps today |
| Growth (Pro) | Full premium tools bundle, no per-tool paywalls | 7 tool routes + 4 AI edge fns have **zero** tier check (client OR server) | PARTIAL / privilege escalation | **BUILD** server gate in 4 edge fns + client `<ToolAccessGate>` on 7 pages |
| Growth | 1 Featured Boost/mo included | Not granted anywhere | MISSING | **SOFTEN** — remove "1 included" line (credit-grant infra out of day scope) |
| Growth | Recurring availability | Not implemented | MISSING | **SOFTEN** — remove |
| Growth | Custom deposits & cancellation rules | `deposit_amount` open to all tiers | Free-for-all | **SOFTEN** — reframe as included from Free |
| Growth | Storage add-ons, cleaning fees | No schema/UI | MISSING | **SOFTEN** — remove |
| Growth | $10 off notarization | Notary excluded | N/A | Leave copy as-is per instructions |
| Operator | Multi-location / fleet portfolio | Not implemented | MISSING | **SOFTEN** — remove |
| Operator | Team member access & permissions | Not implemented | MISSING | **SOFTEN** — remove |
| Operator | Utilization analytics | Not implemented | MISSING | **SOFTEN** — remove |
| Operator | Accounting exports | Not implemented | MISSING | **SOFTEN** — remove (>day of scope for CSV exports across sales/rentals + tax breakdown) |
| Operator | Custom intake questions per booking | Not implemented | MISSING | **SOFTEN** — remove |
| Operator | Dedicated support in hours | Same as Starter priority | MISSING | Rolled into priority-support BUILD (Operator = highest priority tier) |
| Operator | BuildKit included | Same tools-gate issue | PARTIAL | Fixed by tools-gate BUILD |
| `pro_weekly_pass` | 7 days all Pro, no auto-renew | `resolveHostTier` reads `access_ends_at` | WORKS | — (value improves after tools-gate BUILD) |
| `boost-featured-30` | Featured badge + priority placement + refresh, 30d | Badge + `listing_promotions` work; **no featured-first sort** in search | PARTIAL | **BUILD** featured-first ordering in listing search query |
| `permit_path_plus` | Personalized checklist, saved progress, docs, deadlines | Tables + `useToolAccess` gate exist; `/tools/permitpath` page itself ungated | PARTIAL | Covered by tools-gate BUILD (route enforces purchase-or-tier) |
| `listing_rewrite` | We rewrite in 3 business days | No fulfillment queue or admin surface | MISSING/PARTIAL | **BUILD** admin "Manual services" filter tab keyed on category=`seller_service` + status=`paid` |

No orphan SKUs. No notary SKUs are active.

## BUILD Plan (all fit under a day each)

### 1. Tool bundle server + client gate (largest, ~1 day)
- **Server:** add `resolveHostTier` + purchase-check to `ai-tools`, `ai-marketing-creator`, `ai-web-research`, `ai-equipment-guide`. Return 402 with `{error, upgrade_slug}` when tier insufficient.
- **Client:** new `<ToolAccessGate slug="…">` wrapper reading `useToolAccess`. Wrap the 7 tool page components (`PricePilot`, `ListingStudio`, `MarketingStudio`, `ConceptLab`, `MarketRadar`, `BuildKit`, `PermitPath`). Insufficient access → render a compact upsell block linking to `/plans/tools/:slug` and `/pricing`.
- Grandfather logic already in `useToolAccess.ts` preserved.

### 2. Priority support (~3h)
- Migration: `ALTER TABLE support_tickets ADD COLUMN priority text CHECK (priority IN ('standard','priority','dedicated')) DEFAULT 'standard';`
- Trigger or client-set on ticket creation: read caller tier via `resolveHostTier` in the ticket-create edge function; Growth → `priority`, Operator → `dedicated`.
- UI: "Priority" / "Dedicated" chip on ticket list and detail (`SupportTicketList`, `SupportTicketDetail`).

### 3. Featured-first search sort (~2h)
- In the listing search/browse query (`useListings`/`ListingBrowse` — locate exact file), add secondary order `is_featured desc nulls last` before existing sort. Compute `is_featured` via `listing_promotions.featured_expires_at > now()` or reuse `featured_enabled` on listings.

### 4. Manual-services admin queue (~3h)
- In `AdminMonetizationOps`, add tab "Manual services" filtering `monetization_purchases` where `product.category = 'seller_service'` and `status = 'paid'` and no `fulfilled_at`. Row action: "Mark fulfilled" writes `fulfilled_at` + admin note.

## SOFTEN Plan (copy-only edits)

Update these files to remove/reframe unbacked lines above:
- `src/components/monetization/tierCatalog.ts` (host & seller feature arrays for growth + operator)
- `src/components/monetization/PlansComparisonTable.tsx` (drop rows: multi-location, team access, utilization, accounting exports, custom intake, storage add-ons, recurring availability; keep or reframe deposits)
- `src/lib/monetization/learnMoreCatalog.ts` (rewrite growth/operator outcomes to reflect delivered value: tools bundle, boost credit gone, priority support, faster payouts if real)
- `src/pages/Pricing.tsx` one-liners
- `src/components/monetization/PremiumPlansSection.tsx` hero bullets

Rewrites will emphasize what IS delivered: tools bundle (post-BUILD), AI listing generator, priority/dedicated support, notarization discount (unchanged), payment protection, e-signatures.

## Out of scope (flagged, not built)
- Featured Boost monthly credit for Growth subscribers (needs credit-ledger schema).
- Multi-location, team access, utilization analytics, accounting exports, custom intake (each is multi-day).
- Notary — owner is wiring their own integration.

## Verification
- `tsgo` typecheck after edits.
- Manual: signed-out visit to `/tools/pricepilot` → sees upsell, not the tool.
- DB: existing paid `permit_path_plus` purchase still resolves via `useToolAccess`.

Approve and I'll ship in this order: BUILD 1 → 2 → 3 → 4 → SOFTEN copy → typecheck.
