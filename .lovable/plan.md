# Monetization Audit — Findings & Proposed Fixes

Read-only audit of the five requested workstreams. Nothing has been edited. Diffs below are the minimal changes I would apply on approval.

---

## 1. Webhook routing collision — **HIGH**

**What I confirmed (code):**
- `monetization-webhook` handles: `checkout.session.completed`, `charge.refunded`, `payment_intent.payment_failed`, `customer.subscription.{created,updated,deleted}`, `invoice.paid`, `invoice.payment_failed`. It inserts every event into `stripe_webhook_events` for idempotency (unique on `stripe_event_id`).
- `stripe-webhook` handles: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `charge.dispute.created`, `transfer.paid`, `transfer.failed`. It does **NOT** touch `stripe_webhook_events` — it uses per-domain idempotency (e.g. `pending_featured_payment.session_id`, `sale_transactions` unique keys, `refund_event_id`).
- Overlapping event types: **`checkout.session.completed`, `charge.refunded`, `payment_intent.payment_failed`**.

**Why the collision matters:**
The two functions are separate Stripe webhook endpoints; Stripe fans out the same event to both when both are subscribed. In practice they self-select by metadata (`monetization-webhook` no-ops when no `monetization_purchases` row matches `stripe_session_id`; `stripe-webhook` no-ops when metadata isn't its shape). That means today they don't corrupt each other's data — but:
- The unique constraint on `stripe_webhook_events.stripe_event_id` still means whichever function runs second **silently records `duplicate key` on insert** and only survives because the try/catch treats the row as "already processed" (see monetization-webhook lines 43–56). Any future refactor that trusts "row exists ⇒ we handled it" will skip the sibling's events.
- No enforced guarantee that the two endpoints stay disjoint. A future case added to one is the next Sev-1.

**Proposed fix (namespace the idempotency key):**
- Migration:
  - `ALTER TABLE public.stripe_webhook_events ADD COLUMN endpoint text NOT NULL DEFAULT 'monetization';`
  - Drop the single-column unique, add `UNIQUE (endpoint, stripe_event_id)`.
- `supabase/functions/monetization-webhook/index.ts` — pass `endpoint: 'monetization'` on insert/update.
- `supabase/functions/stripe-webhook/index.ts` — add the same idempotency insert with `endpoint: 'core'` at the top of the handler; short-circuit if the row already exists. Removes the reliance on per-domain guards.
- `supabase/functions/admin-billing-ops/index.ts` — its webhook health queries need to filter by `endpoint`.

---

## 2. Billing period field on API 2025-08-27.basil — **HIGH**

**What I confirmed (code):**
`supabase/functions/monetization-webhook/index.ts` line 422–423 reads `sub.current_period_start` / `sub.current_period_end` directly off the subscription object and writes them into `host_subscriptions`. Same values flow into the "Renews / Access ends" copy in every subscription email (lines 445, 454, 475, 483, 485).

**Why this breaks on 2025-08-27.basil:**
Stripe moved `current_period_start` / `current_period_end` off `Subscription` and onto `SubscriptionItem`. On this API version the top-level fields are `null` for subscriptions created after the cutover, so `host_subscriptions.current_period_end` will be `null`, `HostSubscriptionCard` renders "—" for "Renews", and emails send `Invalid Date`.

**Proposed fix:**
- In `handleSubscriptionChange`, resolve period from item first:
  ```ts
  const item = sub.items?.data?.[0];
  const periodStart = sub.current_period_start ?? item?.current_period_start ?? null;
  const periodEnd   = sub.current_period_end   ?? item?.current_period_end   ?? null;
  ```
  and use those everywhere `sub.current_period_*` is read in this file.
- One-time backfill migration:
  ```sql
  -- Recompute for any row we already wrote as NULL.
  -- Requires calling Stripe; simplest path is to run monetization-reconciler
  -- with a new mode 'resync_subscriptions' (see item 5) — no SQL-only fix.
  ```
  Adding a `resync_all_subscriptions` action to `admin-billing-ops` (it already has `resync_user`) covers the backfill without inventing a one-off script.

---

## 3. Promotion & Featured expiry — **HIGH**

**What I confirmed (code):**
- `supabase/functions/notify-expired-boosts/index.ts` clears `listings.featured_enabled=false` for rows past `featured_expires_at`, but it does **NOT** clear `featured_expires_at`, does **NOT** touch `listing_promotions.active`, and **skips rows where `featured_expires_at IS NULL`** (line 37 `.not("featured_expires_at","is",null)`).
- `rg` across `supabase/migrations/` for `notify-expired-boosts` and `listing_promotions.*active` returns **no cron.schedule**. This function is only invokable manually. No scheduled job deactivates `listing_promotions` either.
- Search/placement filters:
  - `search-listings` (lines 354, 375) correctly filters `featured_enabled && featured_expires_at > now`.
  - `HomepageFeaturedRow.tsx` (lines 35–36) correctly filters both.
  - `src/lib/featured.ts` `isListingFeatured` correctly requires both.
  - `listing_promotions` however is queried in several places by `active=true` alone (e.g., `monetization-reconciler` line 148, `PromoteListingPanel`) with no `ends_at > now` guard — stale `active=true` rows silently keep promotion state alive.

**Proposed fix:**
- Extend `notify-expired-boosts` to also:
  - `UPDATE listings SET featured_expires_at = NULL WHERE featured_enabled = false AND featured_expires_at < now()` (clears staleness).
  - `UPDATE listing_promotions SET active = false WHERE active = true AND ends_at < now()` (mirror of `complete-ended-bookings`).
  - Handle the "NULL expiry" orphan class by adding a second candidate query: `featured_enabled = true AND featured_expires_at IS NULL AND NOT EXISTS (active listing_promotions row)` → clear the flag.
- New migration to schedule it daily (modeled after `complete-ended-bookings` cron in `20260420212739_...sql`).
- Deterministic one-shot repair in the same migration:
  ```sql
  UPDATE public.listings
     SET featured_enabled = false,
         featured_expires_at = NULL
   WHERE featured_enabled = true
     AND (featured_expires_at IS NULL OR featured_expires_at < now());
  UPDATE public.listing_promotions
     SET active = false
   WHERE active = true AND ends_at < now();
  ```
- Fix every read that trusts `active` alone to also require `ends_at > now()`:
  - `supabase/functions/monetization-reconciler/index.ts` (line 148 select)
  - `src/components/monetization/PromoteListingPanel.tsx`
  - `src/pages/ListingPublished.tsx` (grep confirms it reads promotions)
  - `src/pages/AdminRevenue.tsx`

---

## 4. Subscription checkout compliance (ROSCA + CA AB 2863) — **HIGH**

**What I confirmed (UI code):**
- `HostSubscriptionCard.tsx` → "Change plan" link goes to `/host/plans` (`HostProPlans.tsx`), which renders `ProductPricingCard` items. Buying calls `create-monetization-checkout` and does `window.location.href = url` straight into Stripe Checkout.
- No pre-checkout **affirmative-consent checkbox** anywhere in `src/components/monetization/`. `ProductPricingCard.tsx`, `UpgradePackageCards.tsx`, and `RecommendedAddOns.tsx` all jump straight to Stripe on click.
- No visual **auto-renew disclosure adjacent to the pay button.** The only renewal copy is one gray sentence at the bottom of the page ("Subscriptions are managed through Stripe. Upgrade, downgrade, or cancel any time…") — not in visual proximity to the CTA, and it does not state the renewal price or frequency inline.
- No **consent record** is written for subscription starts. `user_consents` is only written for the legal document flow (`useRecordConsent`).
- Cancellation is self-serve via the **Stripe Billing Customer Portal** (`customer-portal` edge function invoked from `HostSubscriptionCard` "Manage billing"). Same-medium requirement is met **only if the user is already subscribed** — a prospective subscriber has no visible cancellation instructions before paying.
- Legal pages: `LegalDocumentPage` + `legal_documents` table cover `terms_of_service`, `privacy_policy`, `marketplace_rules`, `seller_terms`, `renter_terms`, `pay_in_person_acknowledgment`, `featured_listing_terms` (see `src/lib/legalDocuments.ts`). There is **no dedicated `subscription_terms` document**, and no **refund/cancellation policy** doc. Terms & Privacy are linked in the site footer but not at the subscription checkout CTA.

**Gap summary vs ROSCA / AB 2863:**
| Requirement | Status |
| --- | --- |
| Clear disclosure of price, frequency, auto-renewal, renewal price, cancellation method in visual proximity to consent | Missing |
| Unchecked (never pre-checked) affirmative-consent checkbox gating pay | Missing |
| Consent record (user, ts, tier, price shown, terms version) | Missing |
| Self-serve online cancellation via same medium | Present (portal) but not surfaced pre-purchase |
| Terms of Service page | Present |
| Subscription Terms page | Missing |
| Refund / Cancellation policy page | Missing |
| Privacy Policy page | Present |
| All four linked at checkout | Missing |

**Proposed minimal additions:**
- New shared component `src/components/monetization/SubscriptionConsentGate.tsx`:
  - Renders directly above the CTA on `ProductPricingCard` (recurring plans only) and `UpgradePackageCards` (recurring tiers).
  - Displays: plan name, price, billing frequency, "Renews automatically at $X every month/year until you cancel", "Cancel any time in Manage Billing (link to Stripe Portal instructions)", and four inline links (Terms, Subscription Terms, Refund & Cancellation, Privacy).
  - Unchecked `<Checkbox>` bound to a local state — CTA disabled until checked.
  - On confirm, calls `useRecordConsent` with a new trigger `SUBSCRIPTION_CHECKOUT` and a payload `{ tier, product_slug, price_shown_cents, currency, interval, renewal_price_cents }` stored in `related_ids`/`acceptance_text`.
- `src/lib/legalDocuments.ts`: add `SUBSCRIPTION_TERMS` and `REFUND_CANCELLATION_POLICY` document types + slugs `subscription-terms`, `refund-policy` + `CONSENT_TRIGGERS.SUBSCRIPTION_CHECKOUT`.
- Migration: seed `legal_documents` rows for the two new doc types (v1) so `useLegalDocument` resolves them.
- `HostSubscriptionCard.tsx`: add a small "Cancel any time in Manage Billing" line under the plan card even when no subscription is active (so the same-medium cancellation is visible to prospective subscribers when they visit `/account`).
- No changes to `create-monetization-checkout` server code required; consent is captured before the CTA fires.

I avoided the disallowed word throughout.

---

## 5. Reconciler coverage — **MEDIUM**

**What I confirmed (code):**
`supabase/functions/monetization-reconciler/index.ts` only reconciles `monetization_pending_reconciliation` (one-time purchases via `checkout.sessions.retrieve`). It:
- Does NOT pull subscriptions from Stripe.
- Does NOT touch `host_subscriptions`.
- Does NOT expire stale `listing_promotions` (queries `active` without `ends_at` guard).

Subscription drift repair exists only in `admin-billing-ops.resync_user` — but it's per-user manual, not a sweep.

**Proposed fix:**
- Extend `monetization-reconciler` with two new phases after the existing purchase sweep:
  1. **Subscription drift sweep.**
     - Pull `host_subscriptions` where `status IN ('active','trialing','past_due')`.
     - For each, call `stripe.subscriptions.retrieve(stripe_subscription_id, { expand: ['items.data.price'] })`.
     - If Stripe status/tier/period differs, `UPDATE host_subscriptions` using the same field-resolution as item 2 (item-level period fallback).
     - If Stripe returns `canceled` or 404, downgrade the row.
  2. **Promotion expiry sweep.**
     - `UPDATE listing_promotions SET active=false WHERE active=true AND ends_at < now()`.
     - Delegate to the item-3 job for `listings.featured_*` cleanup (single owner).
- Return counts per phase in the response and surface them in `AdminMonetizationOps.tsx` so ops can see drift trends.
- Wire into pg_cron (hourly) via new migration.

---

## Severity summary

| # | Item | Severity |
| - | ---- | -------- |
| 1 | Webhook idempotency namespacing | High |
| 2 | Subscription period field on API 2025-08-27.basil | High |
| 3 | Featured / promotion expiry job + orphan repair | High |
| 4 | Subscription consent + disclosures + docs | High |
| 5 | Reconciler sweep for subscriptions + promotions | Medium |

## Files that would change

**Migrations (new):**
- `add endpoint column + unique to stripe_webhook_events` (item 1)
- `seed subscription_terms + refund_policy legal_documents` (item 4)
- `schedule notify-expired-boosts + monetization-reconciler cron; one-shot orphan repair` (items 3, 5)

**Edge functions:**
- `supabase/functions/monetization-webhook/index.ts` (items 1, 2)
- `supabase/functions/stripe-webhook/index.ts` (item 1)
- `supabase/functions/notify-expired-boosts/index.ts` (item 3)
- `supabase/functions/monetization-reconciler/index.ts` (items 3, 5)
- `supabase/functions/admin-billing-ops/index.ts` (items 1, 2 — filter by endpoint, add `resync_all_subscriptions`)

**Frontend:**
- `src/components/monetization/SubscriptionConsentGate.tsx` (new, item 4)
- `src/components/monetization/ProductPricingCard.tsx` (mount gate, item 4)
- `src/components/monetization/UpgradePackageCards.tsx` (mount gate for recurring, item 4)
- `src/components/monetization/PromoteListingPanel.tsx` (add `ends_at` guard, item 3)
- `src/components/account/HostSubscriptionCard.tsx` (surface cancel path pre-purchase, item 4)
- `src/pages/ListingPublished.tsx`, `src/pages/AdminRevenue.tsx` (add `ends_at` guard, item 3)
- `src/lib/legalDocuments.ts` (new doc types + trigger, item 4)
- `src/pages/LegalDocumentPage.tsx` — no code change; loads new slugs automatically.

Awaiting approval before switching to build mode.
