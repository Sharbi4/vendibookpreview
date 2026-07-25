# Plans "Learn more" overlay + legal document link fix

## PART A — Diagnosis: Broken "Open full document" link

**Root cause found.** `useLegalDocumentBySlug` (`src/hooks/useLegalDocument.ts`) filters `status = 'active'`, but two rows in `legal_documents` are stored with `status = 'published'`:

| slug | status |
|---|---|
| `subscription-terms` | `published` ❌ |
| `refund-cancellation-policy` | `published` ❌ |
| (7 others) | `active` ✅ |

Result: `/legal/subscription-terms` and `/legal/refund-cancellation-policy` render the empty-state fallback. The signup consent's "open full document" for Terms of Service actually works today; the failure the user hit is on the subscription-terms link surfaced from `SubscriptionConsentDialog` (and any signup surface that also links to refund/cancellation policy).

Additionally, the `current_legal_document` RPC used by `useLegalDocument` (in-modal) may share the same filter — will verify and align.

### Fix
1. **Data**: `UPDATE legal_documents SET status='active' WHERE slug IN ('subscription-terms','refund-cancellation-policy');` (via `supabase--insert`).
2. **Resilience**: change `useLegalDocumentBySlug` to accept `status IN ('active','published')` so any future seeded row with either status resolves.
3. **Verify** the `current_legal_document` RPC returns the row for both types after the update (read-only check).
4. **LegalDocumentPage** already renders a friendly not-found state — leave as is (was previously blank only because the query returned `null` silently which it still displays; confirm error path is user-friendly, no code change needed beyond wording tweak if warranted).

### Click-test matrix (post-fix)
Manually verify each surface's "Open full document" / "View full document" link resolves to a rendered `/legal/:slug` page:

| Surface | Doc type | Expected slug |
|---|---|---|
| Signup consent (`AuthFormPanel` → `ConsentModal`) | terms_of_service | `/legal/terms` |
| Signup consent | privacy_policy | `/legal/privacy` |
| `SubscriptionConsentDialog` | subscription_terms | `/legal/subscription-terms` |
| Pay-in-Person (`FinalReviewSheet`) | pay_in_person_acknowledgment | `/legal/pay-in-person-terms` |
| Featured listing activation (`PublishWizard`) | featured_listing_terms | `/legal/featured-listing-terms` |
| Purchase/Booking review | seller_terms / renter_terms | `/legal/seller-terms`, `/legal/renter-terms` |
| Marketplace rules link | marketplace_rules | `/legal/marketplace-rules` |
| Refund policy link | refund_cancellation_policy | `/legal/refund-cancellation-policy` |

Report pass/fail per row after fix.

---

## PART B — ProductLearnMoreOverlay

### New reusable component
`src/components/monetization/ProductLearnMoreOverlay.tsx` — one component, responsive:
- **Desktop**: Radix Dialog, centered, r-lg, `dash-glass`, max-w-2xl.
- **Mobile**: Radix Sheet from bottom, 92dvh, same tokens.
- **Deep-link**: reads `?learn=<slug>` on mount and opens automatically; writes/removes the param on open/close via `useSearchParams` so URLs like `/pricing?learn=pro` land straight in the overlay.
- **Content** (driven by a typed catalog entry):
  - Title + one-line promise
  - Price row (`$X /mo` or `$X one-time`) with billing terms
  - "Best for" line (plans only)
  - **What you get** — icon bullets (Lucide, no sparkles), each with an outcome sentence (e.g., "Boost placement: your listing appears above standard results for 30 days, typically 3–5× more views")
  - **See it in action** — 2–3 real screenshots captured from live pages (dashboard analytics, PermitPath, a boosted listing card). Stored under `src/assets/learn-more/` and imported statically. No AI art.
  - Sticky footer with the **same buy CTA** the parent card uses (consent gate intact — reuse the parent's handler by passing `onBuy` prop). "Continue without buying" secondary close.

### Catalog
`src/lib/monetization/learnMoreCatalog.ts`:
```ts
export interface LearnMoreEntry {
  slug: string;              // ?learn= value
  productKey: string;        // maps to product_key / tier
  name: string;
  promise: string;
  price: string;
  billing: string;
  bestFor?: string;
  outcomes: { icon: LucideIcon; title: string; body: string }[];
  screenshots: { src: string; alt: string; caption: string }[];
  ctaLabel: string;
}
```
Entries: `starter`, `pro`, `premium`, `pro-weekly`, plus every active one-time add-on (featured boost tiers, PermitPath unlock, BuildKit, PricePilot, etc.) — pulled from existing `catalog.ts` + monetization products.

### Wire "Learn more" secondary link into
- `PremiumTierCard.tsx` (used by `PremiumPlansSection.tsx`, `Pricing.tsx`, `HostProPlans.tsx`)
- `ProductPricingCard.tsx` (add-ons on Pricing + Purchases + Promote surfaces)
- `PremiumToolsTab.tsx` (dashboard Membership / Premium Tools tiles)
- `ToolPreview.tsx` (locked-tool preview surfaces — CTA already exists, add secondary "Learn more" that opens overlay with the tool's entry)

Link styling: quiet ghost text link under primary CTA, `text-xs font-medium text-white/60 hover:text-white/90 underline-offset-4 hover:underline`.

### Analytics
Reuse existing `trackEvent()` (`src/lib/analytics.ts`):
- `learn_more_opened` `{ product_slug, surface, deep_link: bool }` on open
- `learn_more_converted` `{ product_slug, surface }` when buy CTA inside overlay is clicked

### Screenshots
Capture from running preview via Playwright to `/mnt/documents/`, review, then commit trimmed webp/png files under `src/assets/learn-more/`. Targeted captures:
1. Dashboard KPI/analytics strip (for Pro/Premium)
2. Featured listing card with boost badge (for featured add-ons / Pro placement)
3. PermitPath ResultsDashboard (for PermitPath entry and Premium)
4. Payouts/earnings block (for Starter and lower fees narrative)

### Not touched
- Consent gates, Stripe calls, entitlement resolution, pricing math, terms flow.
- No changes to `create-checkout` / `create-monetization-checkout`.
- Dashboard layout, tokens, typography system.

---

## Deliverables
1. Migration-free data patch: `UPDATE legal_documents SET status='active' ...` via insert tool.
2. `src/hooks/useLegalDocument.ts` — accept `active|published`.
3. `src/lib/monetization/learnMoreCatalog.ts` (new).
4. `src/components/monetization/ProductLearnMoreOverlay.tsx` (new).
5. `src/assets/learn-more/*.png` (new — real captures).
6. Edits to `PremiumTierCard.tsx`, `ProductPricingCard.tsx`, `Pricing.tsx`, `HostProPlans.tsx`, `PremiumToolsTab.tsx`, `ToolPreview.tsx` to render the secondary link and mount the overlay.
7. Typecheck + click-test report of every legal link.
