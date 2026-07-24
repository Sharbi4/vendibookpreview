# Vendibook Monetization & Services Platform

This is a large, multi-phase build. Phase 1 groundwork already exists (`monetization_products`, `monetization_purchases`, `listing_promotions`, `stripe_webhook_events`, `create-monetization-checkout`, `monetization-webhook`, `UpgradePackageCards`, `PromoteListingPanel`, `AdminRevenue`, seeded $49/$149/$499 catalog). Free listing flow, Stripe Connect, Affirm, contracts, verification, messaging, calendar, dashboards, reviews, and existing rental/sale flows remain untouched.

Below is the sequenced plan. I'll implement one phase per approval so each ships stable, tested, and mobile-clean before moving on.

---

## Phase 1 — Seller Upgrades polish + Admin catalog (extends existing groundwork)

**Data**
- Extend `monetization_products` with: `category`, `billing_type` (`one_time|recurring|percentage|custom`), `applicable_listing_types text[]`, `included_features jsonb`, `display_order`, `promo_price_cents`, `promo_starts_at`, `promo_ends_at`, `upgrade_eligibility jsonb`.
- Add `discount_codes` + `discount_code_redemptions` (percent/fixed, max redemptions, expiry, product scope).
- Add unique partial index on `listing_promotions(listing_id, product_slug)` where active, to block overlapping duplicates.

**Backend**
- Extend `create-monetization-checkout` to accept discount codes and validate product active window.
- `monetization-webhook`: idempotency via `stripe_webhook_events.event_id` (already present) + upsert purchase; only fulfill on `payment_intent.succeeded` / `checkout.session.completed` with `payment_status = 'paid'`.
- New edge fn `admin-monetization-products` (CRUD, admin-only via `has_role`).

**UI**
- `/admin/revenue` gains tabs: Products, Purchases, Promotions, Discount Codes, Refunds.
- Wizard final step: `UpgradePackageCards` + persistent "Continue with free listing" primary link.
- Seller dashboard: keep `PromoteListingPanel`, add per-listing analytics (impressions/views/saves/messages/offers) from `listing_events` + `listing_analytics_daily`.

**Tests**
- Vitest: discount code math, promo-window active check, duplicate-overlap block.
- Playwright: free path unblocked; upgrade purchase → featured badge appears.

---

## Phase 2 — Vendibook Protected Sale

**Data**
- New `protected_sale_transactions` (extends existing `sale_transactions` semantics without breaking them): `fee_bps`, `fee_min_cents`, `fee_max_cents`, `computed_fee_cents`, `deposit_cents`, `vin`, `condition_checklist jsonb`, `ownership_docs jsonb`, `fulfillment_method`, `buyer_confirmed_at`, `seller_confirmed_at`, `payment_released_at`, `status` (state machine), `terms_id` (reuse existing `transaction_terms`), `dispute_id`.
- Admin-configurable fee config in `monetization_products` row `protected-sale-fee` (percentage billing_type).

**Backend**
- Edge fn `create-protected-sale` — computes fee (4.9%, min $499, max $3000, admin override), creates Stripe Checkout with metadata + Connect destination, writes `transaction_terms` snapshot (reuse hardened pattern).
- Extend `stripe-webhook` (existing source of truth): on paid, flip status → `payment_completed`, notify both parties. Reuse `send-transactional-email`.
- Language: "protected payment process" / "payment held according to transaction terms" — never "escrow".

**UI**
- Sale checkout: two large cards — "Pay/Complete in Person" (existing free flow) vs "Vendibook Protected Sale" (new). Fee breakdown modal shows exactly what's included.
- New `/transactions/protected/:id` timeline: verification → agreement → payment → docs → handoff → release.

**Tests**
- Fee math (min/max/percentage) with half-away-from-zero rounding (reuse existing helpers).
- Webhook idempotency + duplicate-refresh guard.

---

## Phase 3 — Buyer Services

- Products: `Buyer Readiness Pass ($29)`, `Listing Purchase Review ($149)`.
- New `service_requests` table (user, listing, product, payload jsonb, status, admin_notes, fulfilled_at).
- Structured intake form for Purchase Review; admin queue at `/admin/services`.
- Optional credit of $29 toward Protected Sale (config flag on product row).
- Buyer dashboard section: "Service Purchases" with statuses (Not started → Completed).

---

## Phase 4 — Host Pro Subscriptions

- Products: `$39 / $89 / $149` monthly (Stripe recurring).
- Reuse existing subscription pattern (customer lookup by email, `check-subscription`, `customer-portal`).
- Table `host_subscriptions` (user_id, product_slug, stripe_subscription_id, status, current_period_end, trial_end).
- Feature-gate helper `useHostTier()` — never removes free-host access; only adds tools.
- Manage subscription button → Stripe billing portal.

---

## Phase 5 — Permit Path monetization

- `Permit Path Plus ($29)`, `Permit Path Concierge ($299)`.
- Extend existing `permit_progress` / `permit_documents` / `saved_permit_roadmaps` with `service_level` column.
- Concierge intake → admin queue (reuse `service_requests`).
- Prominent legal disclaimer component.

---

## Phase 6 — Partner Services + Leads

- New `partners` (company, logo, category, service_area, website, phone, verified, featured, sponsored).
- Reuse `listing_leads` shape, add `partner_leads` (user, listing, partner, service, budget, timeline, status, consent_at).
- Explicit consent checkbox before sharing user info.
- Listing-page services panel (collapsible) — sale vs rental vs kitchen variants.

---

## Phase 7 — Services Marketplace + Homepage tie-in

- `/services` page: "Everything You Need to Start and Grow Your Food Business", category rails, pricing cards, FAQs.
- Homepage strap: "Find it. Fund it. Verify it. Purchase it. Permit it. Start earning."
- Cross-links from Buyer/Seller dashboards + main nav under "Tools".

---

## Phase 8 — Admin controls + Revenue analytics deepening

- Full CRUD across all products, complimentary grants, refunds via Stripe, extend promotions, manual credits, custom invoices, feature-access overrides.
- Analytics: GMV, upgrade revenue, subscription MRR/churn, permit revenue, partner leads, conversion funnels (view→inquiry→transaction, free→paid).
- Charts (Recharts), date filters, CSV export.

---

## Cross-cutting rules (applied every phase)

- Free listing path stays fully free — no paywalls added to creation/search/messaging/saved/inquiries.
- Satin Lux tokens only, orange CTAs, glassmorphism, no `Sparkles`/`Star` icons.
- All emails → `support@vendibook.com`; branded via existing `send-transactional-email` with `idempotencyKey`.
- Every checkout: server-side price, Stripe as source of truth, no fulfillment until webhook confirms paid.
- Mobile: pricing cards stack, 16px inputs, modals fit viewport.
- Copy: transparent (duration, recurrence, cancellation, refund eligibility, limits). No pre-checked add-ons. No dark patterns.
- Never say "escrow"; use "protected payment process".

---

## Technical notes

- New tables follow the four-step migration pattern (CREATE → GRANT → ENABLE RLS → POLICY) with `service_role` grants for edge functions.
- Reuse `edge_action_idempotency` for non-Stripe writes; `stripe_webhook_events` for Stripe.
- All admin routes gated by `has_role(auth.uid(),'admin')`.
- Tests per phase: Vitest for pure logic, Playwright for user-visible flows.

---

## What I'd ship first

**Phase 1 only** — tighten what already exists (admin product CRUD, discount codes, overlap guard, wizard/dashboard polish, tests). Small, verifiable, immediately useful, and doesn't block Phase 2.

Approve the plan and I'll start Phase 1. If you'd rather reorder (e.g., Protected Sale first), tell me which phase to lead with.
