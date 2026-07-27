## Scope

Five parallel workstreams, one shared visual system rooted in the home host-tools ember-glass section. All colors flow through tokens in `index.css` — no inline `text-white`, no ad-hoc `#hex`. Everything reduced-motion aware.

---

### 1. Foundation — shared design primitives (build first, everything else consumes)

New in `src/components/upgrade/`:
- **`GlassPanel.tsx`** — the base surface. Variants: `default`, `elevated`, `hero`. Encodes: `bg: rgba(20,20,23,0.75)`, `backdrop-blur: 24px`, `border: 1.5px hsla(0,0%,100%,0.10)`, `radius: 20px`, soft top inner-highlight, optional ember corner glow.
- **`RecommendedPill.tsx`** — flame-filled small-caps pill, positioned to overlap the top edge of a card. One canonical implementation; every "Recommended" callout imports this.
- **`PlanCard.tsx`** — accepts `plan`, `recommended`, `onSelect`, `benefits[]` (with Lucide icon). Handles the elevated-when-recommended treatment (brighter border + only card with ember glow), staggered entrance, Sofia Pro title, Manrope tabular price with `CountUpNumber`.
- **`CountUpNumber.tsx`** — 600ms tabular-num count-up on mount, `prefers-reduced-motion` short-circuits to the final value.
- **`UpgradeHero.tsx`** — treated hero band using real photography from `src/assets` with a dark gradient overlay. Slotable header + subheadline.
- **`EmberSweep.tsx`** — the very-low-opacity animated ember gradient shared by banner and modal (single implementation, respects reduced motion).

New tokens in `index.css` (HSL only):
- `--ember-500`, `--ember-400`, `--ember-glow`, `--flame-border`
- `--glass-surface`, `--glass-surface-elevated`, `--glass-hairline`
- `--warn-flame` (replaces every `--warning`/amber use)
- `--gold-pro`, `--gold-pro-edge`, `--gold-pro-shadow` (scoped ONLY to Go Pro button)

Add matching Tailwind mappings so `bg-glass`, `border-hairline`, `text-warn-flame`, `bg-gold-pro` work.

---

### 2. Kill amber/yellow app-wide

Global sweep of every `amber-*` / `yellow-*` utility class and every warning-tinted background. Rebuild the identity affordances on the new system:

- **`src/components/home/VerificationBanner.tsx`** → full-width dark-glass strip using `GlassPanel` + `EmberSweep`. Small flame-tinted `ShieldCheck` icon in a soft glowing circle. `#F7F7F8` primary text via `text-foreground`, `#B8B8C0` secondary via `text-muted-foreground`. Compact solid CTA "Verify identity". `sessionStorage` dismiss key, re-appears next session until verified.
- **`src/components/dashboard/shared/IdentityChip.tsx`** → refined pill: dark-glass base, `border: 1.5px hsl(var(--flame-border))`, `ShieldCheck` icon, hover lift.
- Same treatment applied in the sidebar profile block (`DashboardLayout.tsx`) and the attention stack (flame-tinted left edge, not amber).
- `EnhancedProfileNextStepCard.tsx` + `ProfileNextStepCard.tsx` + any residual amber warning surfaces (dashboard warnings, listing wizard warnings) migrated to `--warn-flame`.

No functional / RLS / auth change — visual only.

---

### 3. First-sign-in Welcome Modal — full rebuild

New: `src/components/onboarding/FirstSignInWelcomeModal.tsx`, mounted at the top of `Dashboard.tsx` (not in `DashboardLayout`, so it doesn't fire on every dashboard sub-route).

Behavior:
- Fires once per user. Persisted via `profiles.welcome_seen_at` (migration below) with a `localStorage` optimistic mirror. If either is set → never shows again. Never fires after any plan is chosen (checks `useHostEntitlements().tier !== 'free'`).
- **No auto-dismiss.** No timers. Closes only on: (a) explicit close, (b) plan CTA, (c) "Continue to dashboard".

Composition:
- Desktop: centered `GlassPanel` variant `elevated`, ~880px wide.
- Mobile: full-screen sheet.
- Top: `UpgradeHero` band with treated trailer photography from `src/assets/rise-food-truck-fleet-owner.png` (existing real photo).
- Headline: Sofia Pro "Welcome to Vendibook, {firstName}" + one-line subhead "Listing is free, always. Members get seen first."
- Three `PlanCard`s side by side (stack on mobile). Middle tier is `recommended` — elevated border + only card with ember glow + `RecommendedPill` overlapping the top edge.
- 3 benefit lines max per card, each with a Lucide icon.
- Prices via `CountUpNumber`.
- Staggered entrance (60ms per card + fade), reduced-motion aware.
- Card CTAs: "Start free" / "Go Pro" / "Talk business".
- Secondary text button below, equal dignity, never guilt-worded: "Continue to dashboard".
- Analytics events fired via existing `trackEvent`: `welcome_modal_viewed`, `welcome_modal_plan_clicked` (with `plan_slug`), `welcome_modal_skipped`.

DB migration:
```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS welcome_seen_at timestamptz;
```
No new table, no new grants needed (profiles already granted).

---

### 4. Go Pro button refinement

Refactor `src/components/dashboard/GoProButton.tsx` (single source of truth used by `DashboardLayout` top bar):
- Tighter pill height (32px), 12px horizontal padding.
- Metallic gradient via `--gold-pro` → darker gold, 1px lighter top edge via inset shadow.
- 16px `Crown` from Lucide (never sparkles per project rule).
- `#1A1400` dark text (via `--gold-pro-fg` token).
- Subtle inner shadow.
- Slow shine sweep every ~6s via keyframe on a `::before` overlay; disabled at `prefers-reduced-motion: reduce`.
- Warm glow on hover only.
- Paid users: refined `ProChip` variant — thin gold outline, transparent fill, `PRO` in small caps. Same file, `variant="paid"`.

Gold remains scoped to this component; nothing else in the app uses `--gold-pro`.

---

### 5. Consistency pass — refactor upgrade surfaces onto the new primitives

Every listed surface refactored to import `PlanCard`, `RecommendedPill`, `GlassPanel`, `UpgradeHero`, `CountUpNumber`:

1. `src/pages/Pricing.tsx` — plans grid.
2. `src/pages/AccountSubscription.tsx` — Membership tab plan comparison.
3. `src/components/dashboard/ProSpotlightTile.tsx` — dashboard Pro spotlight.
4. `src/components/monetization/PremiumPlansSection.tsx` — landing pricing.
5. `src/components/monetization/MiniPlansComparison.tsx` — compact comparison used in wizard/panel.
6. `src/components/listing-wizard/MembershipInlinePanel.tsx` — inline wizard upsell (keeps consent-gate wiring intact).
7. `src/components/tools/LockedToolPreview.tsx` — locked-tool overlay.
8. `src/components/monetization/PromoteUpgradesSection.tsx` — Promote & Upgrades section.
9. Any learn-more overlay in Premium Tools.

Report a final list of files touched.

---

### 6. Escrow → payment protection sweep

Global replacement (case-preserving) across `src`, `supabase/functions`, emails, legal-adjacent copy, and marketing:

- "escrow-style" → "payment protection"
- "escrow" → "payment protection"
- "Escrow" → "Payment protection"
- "ESCROW" → "PAYMENT PROTECTION"

Files identified so far (18 hits): `useAdminTransactions.ts`, `PaymentSuccess.tsx`, `faq-chatbot/index.ts`, `create-sale-transaction/index.ts`, `AdminDashboard.tsx`, `create-checkout/index.ts`, `generateReceiptPdf.ts`, `stripe-webhook/index.ts`, `raise-dispute/index.ts` + test, `search.test.ts`, `SellerSalesSection.tsx`, `BuyerSalesSection.tsx`, `EmailReceiptPreview.tsx`, `shared/index.ts`, `InfoPopover.tsx`. Ledger fields / db column names are NOT renamed — copy only.

Report exact instances changed.

---

## Verification

- Playwright screenshots at 390px and 1440px of: verification banner, first-sign-in welcome modal, top bar (free + paid states), plans page.
- `bunx tsgo` clean at the end.
- Confirm publishing still returns 200 with a real authenticated session (the enum-coercion trigger fix from earlier is untouched — we're only editing UI + copy + one additive column).

## Not in scope

Money logic, entitlements resolution, RLS, webhook contracts, business flows. Purely visual + copy + one additive column for the welcome flag.

## Assumptions (call out if wrong)

- The three plan tiers for the welcome modal match the existing catalog: Starter (free), Growth/Pro (recommended, monthly), Enterprise/"Talk business" (contact-sales). If a different tier should be the recommended middle card, tell me.
- "Continue to dashboard" is fine as the secondary label.
- The one-line subhead uses the existing standing copy "Listing is free, always. Members get seen first."
- Emails: `escrow` in template bodies is treated as user-facing copy and swept; email template names / db keys are NOT renamed.

Approve to ship.