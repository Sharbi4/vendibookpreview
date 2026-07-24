
# Monetization Rollout — Remaining Work

Phase 1 (seller upgrades, promotion boosts, Stripe checkout, purchase records, admin revenue, product catalog) and the Protected Sale core (fee calculator, timeline, opt-in card, unified transaction detail, state machine, webhook secret) are already live. This plan covers everything still outstanding from the 20-section brief, without touching existing free flows.

## Scope

Free listings, wizard, dashboards, messaging, calendar, Stripe payments, Affirm, contracts, verification, rentals, sales, saves, alerts, reviews, and transaction workflows stay untouched. Every new surface is additive with a visible "Continue for free" path.

## Workstreams

### 1. Buyer Services (Phase 2)
- Seed `monetization_products` with `buyer_readiness_pass` ($29) and `listing_purchase_review` ($149).
- New table `buyer_service_requests` (listing_id, buyer_id, product_key, status, intake JSON, admin notes, fulfillment fields) with RLS + GRANTs + updated_at trigger.
- Pages: `/buyer/services`, `/buyer/services/readiness`, `/buyer/services/review/:listingId`.
- Reuse `create-monetization-checkout` + webhook to insert `monetization_purchases` and provision the request row.
- Mount `BuyerServicesPanel` on ListingDetail (sale mode), Saved Listings, BuyerDashboard.

### 2. Partner Marketplace + Lead Capture (Phase 2/3)
- Tables: `service_partners` (company, logo, category, service_area, description, website, phone, sponsored, verified, featured, display_order) and `partner_leads` (user_id, listing_id, partner_id, service, location, budget, timeline, status, consent_at).
- Admin CRUD under `/admin/partners`.
- Public page `/services` grouped by category (Financing, Insurance, Inspection, Transport, Kitchens, Builders, Wrap, POS, Fire, Cleaning, Repair).
- `PartnerLeadForm` modal with explicit consent checkbox; never share user info without the checkbox.
- Lead events feed admin queue and analytics.

### 3. Host Pro Subscriptions (Phase 3)
- Stripe products/prices via `stripe--create_stripe_product_and_price`: Host Starter $39/mo, Host Growth $89/mo, Host Operator $149/mo (store Stripe IDs on `monetization_products`).
- New `host_subscriptions` table (user_id, tier, stripe_subscription_id, stripe_customer_id, status, current_period_end, trial_end, cancel_at, last_error).
- Edge functions: `create-host-subscription-checkout`, `host-subscription-portal`, extend `stripe-webhook` to handle `customer.subscription.*` and `invoice.payment_failed` idempotently.
- `useHostSubscription` hook + `HostSubscriptionCard` on Host Dashboard with Upgrade / Downgrade / Cancel / Reactivate / Manage billing.
- Feature-gate helpers (`canUseMultipleLocations`, `canUseTeamAccess`, etc.) — do not remove any capability free hosts already have.

### 4. Permit Path Monetization (Phase 3)
- Products `permit_path_plus` ($29) and `permit_path_concierge` ($299) in catalog.
- Extend existing `permit_progress` / `permit_documents` / `saved_permit_roadmaps` with `service_level` and `concierge_request_id`.
- New `permit_concierge_requests` (user_id, roadmap_id, intake JSON, status, admin_notes).
- Upgrade CTAs on Permit Path dashboard; concierge intake form after purchase.
- Legal disclaimer: "Vendibook does not provide legal advice and does not guarantee permit approval."

### 5. Services Marketplace Hub (Section 12)
- New route `/services` — "Everything You Need to Start and Grow Your Food Business" — with category sections that link to seller upgrades, buyer services, partners, host subscriptions, permits, and Protected Sale.
- Homepage teaser strip with copy: "Find it. Fund it. Verify it. Purchase it. Permit it. Start earning."
- Nav: add "Services" under Tools.

### 6. Dashboard Upgrades (Section 11)
- Seller Dashboard: Listing performance, upgrades, promotions, services, protected transactions, offers, inquiries, subscription, revenue, payouts, docs, reviews (compose existing components; add missing panels as thin wrappers).
- Buyer Dashboard: saved, messages, offers, purchases, rentals, protected transactions, service purchases, financing/inspection/transport requests, Permit Path, docs, reviews.
- Unified status pill set: Not started, Awaiting payment, In review, Awaiting seller/buyer, Docs required, Scheduled, Completed, Cancelled, Refunded, Disputed.

### 7. Admin Revenue & Services (Sections 13–14)
- Extend `/admin/revenue` with tabs: Products, Pricing, Purchases, Subscriptions, Upgrades, Promotions, Service Requests, Protected Transactions, Partner Leads, Discount Codes, Refunds, Failed Payments, Manual Credits, Custom Invoices, Feature Access.
- Charts: GMV, rental/sale revenue, upgrade revenue, MRR, churn, permit revenue, partner leads, refunds, ARPU, funnel conversions (view→inquiry→transaction, free→paid), most-purchased products, revenue by city + listing type.
- CSV export + date + product filters.

### 8. Discount Codes & Promo Credits
- Reuse existing `discount_codes` and `promo_codes`; ensure `create-monetization-checkout` accepts a code, validates on the server, records `discount_code_redemptions` after Stripe confirms.
- Admin UI to create/activate codes, set max uses, expiry, product scope.

### 9. Notifications & Emails (Section 16)
- Extend `send-transactional-email` templates for: upgrade purchased, promotion activated, promotion ending soon, subscription started, subscription payment failed, subscription cancelled, service request received/updated, protected transaction created, docs requested, buyer/seller confirmation needed, payment released, refund issued, partner request submitted.
- Every send uses an idempotency key (already hardened) and writes a row in `notifications` for the in-app center.

### 10. Payment Integrity
- All new checkouts go through `create-monetization-checkout` + `monetization-webhook`; nothing is marked paid until Stripe confirms.
- `edge_action_idempotency` covers subscription/lead/service-request creations.
- Prevent overlapping promotion purchases via a DB check in `listing_promotions` (already present for boosts — extend to new boost types).

### 11. Mobile + Accessibility Pass
- Verify pricing cards stack, modals fit 375px, dashboards scroll, tables become cards.
- Test on the current viewport (458px) after each panel lands.

### 12. E2E Coverage
- Extend Playwright scripts under `tests/e2e/` for: buyer readiness purchase, listing review request, partner lead consent gating, host subscription upgrade/cancel, permit concierge intake, discount code redemption, duplicate-webhook idempotency, mobile layout smoke.

## Technical Details

- New tables always ship with GRANTs (`authenticated` + `service_role`) and RLS scoped to owner or `has_role(auth.uid(),'admin')`.
- Stripe: seamless integration already enabled; use `STRIPE_SECRET_KEY` + existing `STRIPE_WEBHOOK_SECRET`. Subscriptions use Stripe Billing Portal for management.
- Feature flags via `app_feature_flags` so any tier can be soft-launched.
- All prices editable in admin without code changes (source of truth = `monetization_products` row; Stripe price ID stored alongside).
- Reused primitives: `UpgradePackageCards`, `PromoteListingPanel`, `TrustModule`, `JourneyProgress`, `PrimaryActionBar`, `ContinueSetup`, status-pill kit, `NextActionCard`.

## Suggested Execution Order

1. Buyer services + partner marketplace (Phase 2 completion).
2. Services hub page + homepage teaser + nav.
3. Host Pro subscriptions.
4. Permit Path Plus / Concierge.
5. Admin Revenue tab expansion + analytics.
6. Notifications, discount codes, mobile pass, E2E.

## Explicit Non-Goals

- No changes to free listing eligibility, listing wizard steps, existing calendar, existing rentals, existing Stripe Connect payout flow, or existing Affirm eligibility rules.
- No new personal emails as CC/BCC — all admin/support routes stay on `support@vendibook.com`.
- No sparkle/star icons.
- No "escrow" language on Protected Sale — keep "protected payment process" phrasing.

Ready to start with **Buyer Services + Partner Marketplace** on approval, or a different slice if you'd rather sequence it differently.
