# Vendibook Monetization & Services — Phased Plan

This is a large addition. I'll ship it in three phases, each independently useful and testable, so we don't leave placeholder buttons or half-wired Stripe flows. Nothing in the existing app (listing wizard, dashboards, messaging, calendar, current Stripe/Affirm flows, rentals, cash sales, reviews, Permit Path) will be removed or changed in behavior — only extended.

## Guiding rules (apply to every phase)

- Free listing stays free. All paid products are optional, additive, and clearly marked.
- Admin-editable catalog: every product/price lives in a DB table; code never hard-codes dollar amounts.
- Stripe is the single source of truth for payment status — records only flip to `paid` after a Stripe webhook confirms it, using idempotency keys.
- No "escrow" language. Use "Protected Sale", "protected payment process", "payment released per transaction terms".
- No pre-checked upsells, no dark patterns. Every card shows: what you get, how long it lasts, recurring vs one-time, cancellation, refund policy.
- Reuse existing Satin Lux tokens (charcoal, orange CTA, hairline borders, glass). No new visual system.

## Phase 1 — Catalog, Seller Upgrades, Boosts, Admin (this build)

**Database (one migration):**
- `monetization_products` — name, category enum (`listing_upgrade | seller_service | buyer_service | protected_sale | host_subscription | permit_upgrade | partner_service | promo_credit`), description, billing_type (`one_time | recurring | percentage | custom`), price_cents, promo_price_cents, promo_starts_at, promo_ends_at, applicable_listing_types[], features jsonb, display_order, is_active, stripe_product_id, stripe_price_id, upgrade_eligibility jsonb.
- `monetization_purchases` — user_id, product_id, listing_id (nullable), stripe_session_id, stripe_payment_intent_id, amount_cents, status (`pending | paid | fulfilled | refunded | failed`), fulfillment_status, fulfillment_notes, refund_status, metadata jsonb, idempotency_key unique.
- `listing_promotions` — listing_id, product_id, purchase_id, promo_type (`featured_7 | featured_30 | top_of_search | highlight | motivated_seller | email_campaign | social_feature`), starts_at, ends_at, active, metrics jsonb (impressions, views, saves, messages, offers). Unique partial index prevents overlapping same-type promos on one listing.
- `discount_codes` — code, percent_off, amount_off_cents, applicable_categories[], max_uses, uses, starts_at, ends_at, active.
- `discount_code_redemptions` — code_id, user_id, purchase_id.
- `admin_action_idempotency` reused for admin grants.

All tables: GRANT to `authenticated` + `service_role`, RLS: users see their own rows; admins see all via `is_admin(auth.uid())`; products readable by anon when `is_active`.

**Edge functions:**
- `create-monetization-checkout` — validates product active + eligibility, applies discount code, creates Stripe Checkout Session (`mode: payment` or `subscription`), writes `pending` purchase with idempotency key.
- `monetization-webhook` — handles `checkout.session.completed`, `payment_intent.succeeded`, `charge.refunded`. Flips purchase to `paid`, activates `listing_promotions`, fires notification. Idempotent on `stripe_event_id`.
- `admin-monetization-grant` — admin-only complimentary access.

**Frontend:**
- New step in `PublishWizard` before final review: "Boost your listing" with three package cards (Featured $49, Seller Pro $149, White Glove $499) + prominent "Continue with free listing" secondary button. Copy is short and trust-focused.
- Seller dashboard: "Promote Listing" panel (individual boosts) + "Current Promotions" showing start/end/days remaining/metrics.
- Admin route `/admin/revenue`: Products table (create/edit/toggle), Purchases table (filter by product/date/user), Promotions table, Discount codes, Refund action, Manual grant action, Revenue summary cards (gross, by category, refunds, failed payments).
- Notifications: "Upgrade purchased", "Promotion activated", "Promotion ending soon" (3-day cron), "Refund issued". In-app + email via existing `send-transactional-email`.

**Out of Phase 1:** Protected Sale, Buyer services, Host subscriptions, Permit upgrades, Partner cards, Services marketplace page.

## Phase 2 — Protected Sale + Buyer Services + Partner Leads

- `protected_sale_transactions` (extends `sale_transactions` via 1:1 or adds columns for VIN, ownership_doc_url, condition_checklist, deposit_cents, fee_cents, buyer_verified_at, seller_verified_at, bill_of_sale_url, buyer_acceptance_at, seller_payment_confirm_at, dispute_state).
- Server-side fee calc: `max($499, min($3000, sale_price * 0.049))`. Admin-editable in `monetization_products` row category=`protected_sale`.
- Checkout choice screen: "Pay/Complete in Person" (current cash flow) vs "Vendibook Protected Sale" with itemized fee explanation.
- Buyer services: `Buyer Readiness Pass ($29)` product + checklist UI in buyer dashboard; `Listing Purchase Review ($149)` form + admin service queue table `service_requests`.
- `partner_services` + `partner_service_leads` tables + concise services panel on listing detail (collapsible cards, primary CTA unchanged) + consent gate before sharing user info.

## Phase 3 — Host Subscriptions + Permit Upgrades + Marketplace Page + Analytics

- `host_subscriptions` table synced from Stripe subscriptions. Tiers Starter $39/Growth $89/Operator $149. `check-host-subscription` edge fn on login + `customer-portal` fn for manage. Free hosts keep everything they have today; paid tiers *add* tools (feature-flag gates only guard the *new* capabilities).
- Permit Path Plus $29 + Concierge $299 products; extend existing permit UI with tier badge + concierge queue.
- `/services` marketplace page ("Everything You Need to Start and Grow Your Food Business") with category sections, FAQs, pricing cards.
- Admin analytics dashboard: GMV, revenue by category, MRR, churn, conversion (view → inquiry → transaction, free → paid upgrade), top products, revenue by city/listing type. Uses aggregated queries against `monetization_purchases`, `sale_transactions`, `booking_requests`, `host_subscriptions`.

## Technical notes

- Stripe products/prices are created via the Stripe MCP as we build each product — IDs written back into `monetization_products.stripe_product_id/stripe_price_id` so pricing is admin-editable without redeploy.
- Webhook secret: I'll request `STRIPE_WEBHOOK_SECRET` via `add_secret` when we wire the webhook (Phase 1).
- Every new table gets GRANTs + RLS + admin-view-all policy via `has_role(auth.uid(), 'admin')` at creation.
- All new UI uses existing tokens; no new fonts, no new palette.
- Mobile: pricing cards stack, sheets use existing mobile bottom-sheet patterns, tables collapse to cards.

## Question before I start Phase 1

1. **Confirm phase scope** — start with Phase 1 only (catalog + seller upgrades/boosts + admin + webhook), then come back for Phase 2 and 3 as separate builds? Or a different ordering (e.g. Protected Sale first because it's revenue-critical)?
2. **Stripe products** — should I create the initial Stripe products/prices (Featured $49, Seller Pro $149, White Glove $499, and the individual boosts) with the Stripe tools during Phase 1, or would you rather create them yourself in the Stripe dashboard and paste the IDs?
3. **Refund policy copy** — what should the default refund policy string be on listing upgrades? (e.g. "Non-refundable once promotion is active" vs "Refundable within 7 days if no impressions delivered".)

Once you confirm, I'll start Phase 1 with the migration.