
# Post-signup plan selection + app-wide Stripe trust

This is a big surface change touching auth flow, dashboard entry, monetization catalog, consent, and every Stripe surface. Because it modifies conversion-critical routes and adds branding to ~10 surfaces, I want your sign-off on the shape before I write it. **No product code changes yet.**

## 1. Current behavior found

- **Post-signup path:** `src/pages/Auth.tsx` (lines ~38–51) reads `profiles.onboarded_at`. If null, it redirects to `/welcome?returnTo=...`.
- **Welcome page:** `src/pages/Welcome.tsx` is a **full route**, not a modal. It renders `MiniPlansComparison` and two buttons: "Start free" / "See member benefits". A top-right `X` also marks onboarded and returns. **`X` is a silent-dismiss** — violates your rule. Persistence is server-side (`onboarded_at`) — good.
- **Wizard panel:** `src/components/listing-wizard/MembershipInlinePanel.tsx` is a second upsell inside publish flow, gated by `profiles.membership_panel_dismissed_at` + `vb:mship-panel-dismissed:v1` localStorage. Uses `useSubscriptionConsent` correctly.
- **No first-sign-in modal component exists** despite prior summary — only the `/welcome` route.
- **Catalog truth:** `MiniPlansComparison` hardcodes Free / Starter $39 / Growth $89 and does NOT read `useMonetizationProducts`. `MembershipInlinePanel` upgrades to slug `host_growth`. Need to reconcile against live `monetization_products` rows.
- **Free-tier limit:** `useListingQuota` — must confirm actual free limit before writing copy (may not be 2).
- **Founding/grandfathered:** `MiniPlansComparison` swaps row 0 to "Unlimited — early member" when `isFoundingMember`. Welcome doesn't pass the flag, so grandfathered users see misleading "Up to 2".
- **Stripe trust today:** `TrustRow.tsx` (checkout only), `stripe-wordmark-blurple.png`, `powered-by-stripe-white.svg`, `stripe-wordmark-white.png` assets exist and are the owner-supplied ones. No shared component. `SecurePaymentStrip` exists but does not use the Stripe wordmark.

## 2. Changes I'll make

### A. Canonical first-dashboard plan decision
- **Keep `/welcome` route as canonical** (server-persisted, survives device/storage changes).
- Remove the silent-dismiss `X`. Escape moves focus to "Continue with Free" (announced via `aria-live`).
- Layout: premium dark-glass hero, host-tools ember treatment, Sofia Pro display / Manrope body, real food-truck photo (reuse existing `hero-hosttools-bg.png`).
- Free path has equal dignity: full-width outline card at top with a bold "Continue with Free" CTA, supporting line pulled from the verified free limit (I'll read `useListingQuota`/`entitlements` before writing copy — if the free limit isn't 2, I'll use the true value).
- Secondary "Continue to dashboard with Free" link below the comparison.
- Paid CTAs route through existing `useSubscriptionConsent` → `create-monetization-checkout`. On cancel: return to `/welcome`, calm banner, free path intact.
- Grandfathered / already-paid users: skip selector — go straight to dashboard with a small plan-aware toast. Detected via `useHostEntitlements` + `useListingQuota.isGrandfathered`.
- Analytics events (via existing `analytics_events` table): `plan_selector_viewed`, `plan_selector_free_selected`, `plan_selector_paid_selected`, `plan_selector_comparison_expanded`, `plan_selector_checkout_started/cancelled/completed`.

### B. Live catalog truth
- Rewrite `MiniPlansComparison` to read from `useMonetizationProducts('host_subscription')`. Loading skeleton while fetching. If catalog fails, fall back to a safe "See plans" link — never render stale prices.
- Single shared `PlanCard` primitive (already partly exists per earlier design pass — I'll confirm and consolidate) used by: Welcome selector, `/pricing`, Membership tab, dashboard upgrade ribbons, `MembershipInlinePanel`.
- Recommended pill: middle tier resolved by catalog `is_recommended` (or heuristic if the column doesn't exist — I'll check).
- Monthly/annual toggle only if `monetization_products` has both intervals live.

### C. Wizard panel
- `MembershipInlinePanel` continues to exist but re-uses the same `PlanCard` + catalog source, so it can't drift. Still dismissible (secondary upsell, not first-run gate).

### D. Shared Stripe trust component (`StripeTrustBadge`)
New file `src/components/trust/StripeTrustBadge.tsx`.
- Props: `context: 'payments' | 'payouts' | 'identity' | 'combined'`, `surface: 'light' | 'dark'`, `size: 'sm' | 'md'`, optional `className`.
- Uses `powered-by-stripe-white.svg` on dark surfaces, `powered-by-stripe-blurple.svg` on light — never recolored or stretched. `alt` reflects context.
- Copy per context matches your spec exactly ("Secure payments powered by Stripe", etc.).
- One instance per viewport max — component is idempotent via a lightweight context guard.

**Placed on:**
1. `/welcome` plan selector (combined footer)
2. `/pricing` + Membership tab (payments)
3. `SubscriptionConsentDialog` (payments)
4. `AccountSubscription` / `MembershipSummaryCard` (payments)
5. Stripe Connect onboarding banner (`StripeConnectBanner`) + Payouts panel (payouts)
6. Listing wizard card-payment publish step (payments)
7. `SaleCheckout` + `BookingCheckout` (payments) — replaces the ad-hoc `TrustRow` wordmark with the shared component; keeps the card-network row
8. Payment confirmation / receipt surfaces (payments)
9. `IdentityVerification` page (identity)
10. Help Center payments/payouts sections (contextual)

Explicitly NOT added: home hero, blog, general marketing, dashboards (unless the payouts card is present).

### E. Guardrails preserved
- No changes to `create-monetization-checkout`, `create-checkout`, `stripe-webhook`, consent versioning, `host_payment_eligibility` trigger, RLS, or entitlements math.
- No amber/yellow. Gold stays reserved for PRO chip.
- No "escrow" — "payment protection" only.

## 3. Verification I'll run before reporting

- `bunx tsgo --noEmit`
- `bun run build`
- `bunx vitest run` (entitlement + consent suites)
- Playwright: capture `/welcome` and `/pricing` at 390px & 1440px; capture Connect banner and buyer checkout at both viewports. Attach to the final report.
- Manual matrix from your section 7 — I'll list pass/fail per row.

## 4. What I need from you

**Approve or adjust before I start:**

1. **Keep `/welcome` as a route** (current pattern) vs. move to a blocking modal on `/dashboard`. Route is safer for SEO/back-button; modal is what your spec implies. My recommendation: route, because `onboarded_at` already gates it and it survives refresh cleanly.
2. **Grandfathered users on `/welcome`:** auto-skip to dashboard and set `onboarded_at`? Or show a "welcome back" state with plan summary and a single "Continue" CTA? I'll do the second unless you say otherwise.
3. **Monthly/annual toggle:** I'll only show it if the live catalog has annual SKUs. If it doesn't, I'll ship monthly-only and note it.

Reply "go" (with any adjustments) and I'll implement, verify, and report back with screenshots.
