## Monetization Audit — Findings & Proposed Diffs

Scope: five audit items against the current codebase. This report is read-only; no files changed. Verified against `monetization-webhook`, `stripe-webhook`, `monetization-reconciler`, `admin-billing-ops`, `HostSubscriptionCard.tsx`, `ConsentModal.tsx`, and all `create-monetization-checkout` call sites.

---

### 1. Webhook routing collision — RESOLVED (verify only)
**Severity:** was HIGH, now none.
**Evidence:** `monetization-webhook/index.ts` L41–48 inserts into `stripe_webhook_events` with `endpoint: ENDPOINT` and the schema uniqueness is `(endpoint, stripe_event_id)`. `stripe-webhook` writes with its own endpoint tag. Collisions cannot silently drop a handler.
**Diff:** none. Recommend adding a one-line comment on `stripe-webhook` matching the note already present in `monetization-webhook` so future edits keep the namespacing.

---

### 2. Billing period field on API 2025-08-27.basil — RESOLVED (verify only)
**Severity:** was HIGH, now none.
**Evidence:** `monetization-webhook/index.ts` L411–439 and `admin-billing-ops/index.ts` L39–55 both read `itemAny?.current_period_start ?? sub.current_period_start` with the item-level fallback. New writes populate `current_period_end` correctly.
**Diff:** none for new writes. Optional one-shot backfill script (dry-run first) that walks `host_subscriptions` where `current_period_end IS NULL AND stripe_subscription_id IS NOT NULL`, calls `stripe.subscriptions.retrieve`, and patches the row using the same fallback. Include this only if a `SELECT count(*)` shows non-zero legacy rows.

---

### 3. Promotion & featured expiry — RESOLVED (verify only)
**Severity:** was MEDIUM, now none.
**Evidence:**
- `monetization-reconciler/index.ts` L250–263 deactivates `listing_promotions` past `ends_at` and clears `featured_enabled`/`featured_expires_at` on listings past expiry.
- `notify-expired-boosts` performs the same sweep on its own cron.
- Both jobs are on the 6-hour cron installed in the prior batch.
- Orphan rows were repaired in the prior migration.
**Open item to confirm (not code):** grep every placement/search query for `featured_enabled = true` and ensure each also filters `featured_expires_at > now()` (belt-and-braces in case a webhook misses between cron sweeps). Files to check: `src/lib/search/*`, `useFeaturedListings`, home carousel, city landing pages. If any query relies on the boolean alone, add the `ends_at`/`featured_expires_at` predicate. This is a read/audit step, not a schema change.

---

### 4. Subscription checkout compliance (ROSCA + CA AB 2863) — OPEN, MEDIUM–HIGH
**Severity:** MEDIUM–HIGH. All recurring checkouts today go straight to Stripe with no in-app consent record, no proximal auto-renewal disclosure, and no dedicated subscription/refund policy page.

**What exists:**
- Self-serve cancel via Stripe Billing Portal from `HostSubscriptionCard.tsx` L64–80 ✅
- `ConsentModal` primitive with server-side `record_user_consent` writes ✅
- `Terms.tsx`, `Privacy.tsx`, `CaliforniaPrivacy.tsx` pages exist ✅
- `UpgradePackageCards.tsx` L101 shows "per month · cancel anytime" microcopy ✅

**What is missing:**
1. **No consent gate before `startMonetizationCheckout` for `billing_type === 'recurring'`.** Call sites that need the gate:
   - `src/components/monetization/UpgradePackageCards.tsx`
   - `src/components/monetization/RecommendedAddOns.tsx`
   - `src/components/monetization/ListingUpgradesDialog.tsx`
   - `src/pages/HostProPlans.tsx`
2. **No proximal disclosure block** near the pay button showing: plan name, price, billing frequency, "auto-renews until canceled", renewal price, and one-line cancel-anytime instructions.
3. **No dedicated Subscription Terms or Refund/Cancellation Policy pages.** ROSCA/AB 2863 want these distinct and linked from the consent surface.
4. **No consent record on recurring purchases.** We should stamp `user_consents` with `{trigger: 'subscription_start', document_type: 'subscription_terms', tier, price_cents_shown, interval, terms_version}` and pass the returned `consent_id` in `create-monetization-checkout` metadata so the webhook can link it to `host_subscriptions.consent_id`.

**Proposed diffs (files):**
- New: `src/pages/legal/SubscriptionTerms.tsx` + `src/pages/legal/RefundPolicy.tsx`, both registered in `src/lib/legalDocuments.ts` with `CURRENT_VERSIONS`. Router entries in `src/App.tsx`.
- New: `src/components/monetization/SubscriptionConsentGate.tsx` — wraps the pay button, renders the disclosure block, uses `ConsentModal` with `documentType: 'subscription_terms'`, resolves to a `consent_id` before invoking `startMonetizationCheckout`.
- Edit: the four call sites above to route recurring products through `SubscriptionConsentGate`. One-time purchases skip the gate.
- Edit: `src/lib/monetization/products.ts` `startMonetizationCheckout` to accept `consent_id` and forward it in the invoke body.
- Edit: `supabase/functions/create-monetization-checkout/index.ts` to accept `consent_id`, place it in `metadata.consent_id` on the Session (+ Subscription `metadata` via `subscription_data.metadata`), and reject recurring sessions when `consent_id` is missing and `billing_type === 'recurring'`.
- Edit: `supabase/functions/monetization-webhook/index.ts` `handleSubscriptionChange` to copy `metadata.consent_id` into `host_subscriptions.consent_id` on insert/update.
- Migration: add `host_subscriptions.consent_id uuid references user_consents(id)` (nullable to avoid breaking historic rows) with a GRANT-preserving migration.
- Copy: proximal disclosure block wording drafted in the PR body for legal review before ship.

---

### 5. Reconciler coverage — RESOLVED (verify only)
**Severity:** was MEDIUM, now none.
**Evidence:** `monetization-reconciler/index.ts` L205–247 pulls each `host_subscriptions` row with a `stripe_subscription_id`, retrieves the live Stripe subscription, patches `status`, `cancel_at_period_end`, `current_period_end` (item-level fallback), and `cancel_at`. Promotion sweep at L250–263 runs in the same job. Cron installed 6-hourly.
**Diff:** none. Optional: extend the log payload to include `subscription_drift_repaired` counter for easier ops observability.

---

## Summary

| # | Area | Status | Action |
|---|------|--------|--------|
| 1 | Webhook idempotency namespacing | ✅ done | Verify only |
| 2 | Billing period item-level read | ✅ done | Optional backfill if legacy rows exist |
| 3 | Promotion/featured expiry sweep | ✅ done | Audit search queries for `featured_expires_at > now()` filter |
| 4 | ROSCA / AB 2863 subscription consent | 🟡 open | Ship SubscriptionConsentGate + legal pages + metadata pipeline |
| 5 | Reconciler subscription drift | ✅ done | Verify only |

**Recommended next batch:** implement Item 4 as a single PR (7 file edits + 2 new pages + 1 new component + 1 migration). Items 1, 2, 3, 5 need no code changes; the two "optional" tasks can piggy-back if the search-query audit turns up an unfiltered boolean check.

Awaiting approval before making changes.