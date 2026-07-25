## Findings — audit of upsells in the listing flow

### 1. Upsell inventory

| Where | Step | Required? | Unlocks | Works E2E? |
|---|---|---|---|---|
| `MembershipInlinePanel` (Go Pro) | Review | Optional | Host subscription tiers | **Partially broken** — see A |
| `FeaturedListingCard` ($30 boost) | Review | Optional | 30-day featured placement | Works (publish-first then Stripe) |
| `ProofNotaryCard` ($45, sale only) | Review | Optional | E-notarized bill of sale | **Blocks publish** — see C |
| `VendiVisionDialog` (AI copywriting) | Details | Optional | Free (tier-gated features) | Works |
| `StripeConnectBanner` / Modal | Review | Required only if card payments enabled | Free onboarding | Works, gated correctly |
| Identity verification gate | Publish | Required (free) | Persona verification | Works, loud toast |
| `/pricing` deep-link boosts (`boost-featured-30`, `pro_weekly_pass`, `permit_path_plus`, etc.) | Reached via Membership panel | Optional | Various | **Detached from listing** — see D |
| PermitPath / Tools cross-sells | Not inside wizard | — | — | N/A |

### 2. Bugs found

**A. Mid-wizard membership purchase loses the listing** (blocks user goal #3)
- `MembershipInlinePanel.handleUpgrade` navigates to `/pricing?returnTo=<wizardStep>`.
- `src/pages/Pricing.tsx` **never reads `returnTo` from the URL** and never threads it into `PremiumPlansSection` / `PremiumTierCard`.
- Result: after Stripe checkout, user is dumped at `/payment-success?monetization=true` → `/dashboard`. Draft still exists but the user has to hunt for it.

**B. Signed-out "Go Pro" from a wizard-originated Pricing page drops `returnTo`**
- `PremiumTierCard.handleClick` (line 176-184) rebuilds `returnTo` from `location.pathname` only, discarding the incoming `?returnTo=/create-listing/…`.
- After login → auto-checkout → success, user lands at dashboard, not the wizard.

**C. `ProofNotaryCard` can strand the listing at draft**
- Unlike Featured (publishes first, then opens Stripe in a new tab), the notary path **persists data but does NOT flip status to `published`** before opening checkout. It depends entirely on the webhook to publish.
- If the user cancels Stripe, closes the tab, or the webhook is delayed, the listing stays in draft. This violates rule #2 ("upsells never block publish"): notary is an OPTIONAL add-on but currently soft-blocks publish.

**D. `boost-featured-30` bought from `/pricing` without a listing context does nothing visible**
- `create-monetization-checkout` accepts `listing_id`; `monetization-webhook` writes `featured_*` **directly on that listing row**. When bought from `/pricing` with no listing selected, no `listing_id` is sent, and the purchase row is created but no listing is boosted.
- No "unapplied credit" concept exists — the money is spent but the boost is orphaned.

**E. Featured boost purchased from Pricing detour doesn't attach to the in-progress draft**
- Even if we fixed A and passed `returnTo=/create-listing/{id}`, the `boost-featured-30` checkout at Pricing still isn't scoped to `listing_id={draftId}`. The user pays, returns to the wizard, publishes — boost isn't applied.

**F. Cancel URLs point to `/dashboard`, not the wizard**
- `create-monetization-checkout` defaults `cancel_url` to `/dashboard?purchase=cancelled`. When invoked from the wizard detour, cancel should route back to the wizard step.

**G. Stranded draft recovery — verify but no bug expected**
- `useHostListings` fetches all statuses; `HostListings` filters by tab. Need to confirm the "Draft" tab exposes a "Finish publishing" CTA that resumes at the furthest completed step (query string preserved). Will verify and, if missing, add a `Resume` action that navigates to `/create-listing/{id}?step={lastStep}`.

**H. `PublishSuccessModal` "Return to dashboard" navigates to `/dashboard`** — that's expected post-publish, not a bug.

### 3. Money/webhook correctness (spot check summary)

- `create-monetization-checkout`: idempotency key `mon-{user}-{product}-{listing}-{hour}` correct; pending session reused; prices come from `monetization_products` (source of truth).
- `create-featured-checkout`: idempotency key present; refuses when `pending_featured_payment` already set (no double-charge).
- `create-notary-checkout`: needs same idempotency check — will verify.
- `monetization-webhook`: uses `stripe_webhook_events` idempotency table, stacks featured extends cleanly.

### Proposed diffs (small, surgical)

1. **`src/pages/Pricing.tsx`** — read `?returnTo=` from `useSearchParams`, pass to `PremiumPlansSection` and `ProductPricingCard` / `PremiumTierCard` so `successPath` / `cancelPath` route back to the wizard for wizard-originated visits.
2. **`src/components/monetization/PremiumTierCard.tsx`** — when unauthenticated, preserve any incoming `?returnTo=` on the `/auth` hop; after Stripe redirect honor the caller-supplied `successPath`/`cancelPath` (already prop-driven — just needs the caller wiring from #1).
3. **`src/components/monetization/PremiumPlansSection.tsx`** — accept optional `successPath`/`cancelPath` overrides; forward to `PremiumTierCard`.
4. **`src/components/listing-wizard/MembershipInlinePanel.tsx`** — pass the current wizard URL (`/create-listing/{id}?step=…`) as `returnTo` (already partially done); add `listingId` to the URL as `?listingContext={id}` so a boost bought from Pricing can auto-scope.
5. **`src/pages/Pricing.tsx`** (again) — if `?listingContext={id}` is present, thread `listingId` into `ProductPricingCard` so listing-scoped boosts attach correctly (fixes E; partially fixes D for the wizard flow).
6. **`src/components/listing-wizard/PublishWizard.tsx`** — notary path: **publish-first, then open Stripe** (mirror the featured pattern). If user abandons payment the listing is live without notary, matching rule #2. Also add the same `listing_publish_limit_reached` decode + limit-modal branch already used by featured/standard.
7. **`supabase/functions/create-notary-checkout/index.ts`** — add hourly-bucket idempotency key like featured/monetization to prevent double-charge on rapid retries.
8. **Stranded-draft recovery** — verify `HostListings` Drafts tab surfaces a "Finish publishing" action. If missing, add `RowKebabMenu` action `Finish publishing` → `/create-listing/{id}?step={derived_from_data}` (derive step from completeness: photos → details → pricing → availability → review).
9. **Boost-from-Pricing orphaning (D)** — narrow scope: for products with `promo_type ∈ {featured_7, featured_30, top_of_search_7}`, require `listing_id` in the checkout call. If missing, the card renders "Pick a listing" instead of "Buy boost" and opens a listing picker. Prevents orphaned charges without touching money logic.

### Not changing
- No changes to fees, hold periods, payout timing, entitlement resolution rules, or Stripe idempotency keys' semantics.
- No changes to `useListingQuota` (grandfathering intact).
- No changes to identity-verification or Stripe Connect gating.

### After edits
- Typecheck (`bunx tsgo --noEmit`).
- Run the two-scenario journey mentally against the fixed code:
  (a) fresh signup → wizard → publish free (no add-ons) → live.
  (b) fresh signup → wizard → open membership panel → buy Pro from Pricing (wizard-scoped) → returned to wizard step with data intact → toggle Featured Boost → publish → boost applies.
- Report results per stage.

Awaiting approval before editing.