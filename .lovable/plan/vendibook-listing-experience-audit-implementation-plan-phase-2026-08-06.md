# Vendibook Listing Experience — Audit + Implementation Plan (Phase 0)

## 1. Current production route map

| Purpose | Route | Renders | Notes |
|---|---|---|---|
| Entry / marketing | `/list` | `List.tsx` → `QuickStartWizard` | 3 steps: category → mode → location; requires sign-in before draft creation; sessionStorage keys `vendibook_quickstart_draft` / `_resume` |
| Legacy create | `/create-listing`, `/host` | `<Navigate to="/list">` | `CreateListing.tsx` + `ListingWizard.tsx` (1,213 lines) are unreachable dead code |
| AI/import create | `/list/ai` | `AIListingCreator`, `ImportListingWizard` | creates draft, then routes to `/create-listing/:id` |
| Resume / edit / publish | `/create-listing/:listingId`, `/edit-listing/:listingId` | `EditListing.tsx` → `PublishWizard` (4,332 lines) | canonical editor; steps `photos, headline, includes, pricing, details, location, availability, documents, stripe, review` — `stripe` is always filtered out (`skipStripeStep = true`) |
| Post-publish | `/listing-published`, `/listing-published/:listingId` | `ListingPublished.tsx` | boost polling + self-heal publish |
| Buyer detail | `/listing/:id` (plus `/listings/:id`, `/share/listing/:id` redirects) | `ListingDetail.tsx` | owner sees `OwnerBanner` with edit links |
| Dashboard | `/dashboard`, `/host/listings` | `DraftsSection`, `HostListingCard`, `OperationsTable` | all deep-link to `/create-listing/:id` |

Data today: 139 drafts, 85 published, 6 archived.

## 2. Canonical wizard decision

**`PublishWizard` becomes the single canonical creation + edit engine**, re-organized into the six stages you specified. `QuickStartWizard` is absorbed as stage 1 (“What”) inside it rather than a separate pre-flow. `ListingWizard.tsx` + `CreateListing.tsx` are deleted (already unreachable).

Safe consolidation rules:
- `/list` keeps its marketing content but its CTA now opens the new **gateway page** (`/list/start`) rather than the QuickStart modal.
- All existing deep links (`/create-listing/:id`, `/edit-listing/:id`, `/create-listing`, `/host`) keep working — the same route renders the consolidated wizard, resuming from the draft’s saved stage.
- Draft schema is unchanged, so all 139 drafts resume normally. Guest-draft token access (`guest-draft-access`) is preserved verbatim.
- Featured Boost, Proof Notary, membership entitlements, manual payouts, analytics events, and `send-listing-live-email` keep their existing call sites; only the surrounding step container changes.

## 3. Reusable existing schema

`listings` already has: mode, category, subcategory, title, description, condition, year_built, make, model, mileage, fuel_type, highlights[], amenities[], image_urls[], video_urls[], cover_image_url, all pricing columns, deposit_amount, delivery fee/radius/instructions, city/state/postal_code/address/lat/long, freight dims (weight/length/width/height), accept_cash/card, featured_*, proof_notary_enabled, moderation_status, published_at, deleted_at, guest_draft_token, total_slots/slot_names, hourly schedule JSONB.

Also reusable: `monetization_products` / `monetization_product_plans` (admin-configurable price + config — the Concierge $149 becomes a row here, **no hardcoded price**), `monetization_purchases`, `listing_promotions`, `listing_required_documents`, `admin_notes`, `app_feature_flags`.

Structured specs (cooking equipment, refrigeration, electrical, propane, plumbing/tanks, hood/suppression, towing, mechanical, inspections, rental terms) **do not exist** — today they are free-text labels inside `amenities: string[]`.

## 4. New schema (all additive, no destructive migration)

- `listing_specs` — one row per listing, JSONB sections (`cooking`, `refrigeration`, `electrical`, `propane`, `plumbing`, `hood`, `dimensions`, `mechanical`, `inspections`, `inclusions`, `viewing`, `site`) + `confirmed_sections text[]`. RLS: owner full access; public read only when the listing is publicly visible.
- `listing_rental_terms` — structured rental terms (min/max period, deposit, fees, mileage/generator allowances, fuel/propane, pickup/return, late fees, driver/towing, insurance, permitted/prohibited uses, cancellation, condition photos).
- `listing_completeness` — computed score + `readiness_level` enum (`published`, `buyer_ready`, `highly_detailed`), `updated_at`; refreshed by a trigger on `listings` / `listing_specs`.
- `listing_spec_suggestions` — AI-extracted candidate specs with `status` (`suggested`, `confirmed`, `rejected`); never public until confirmed.
- `listing_service_orders` — Concierge orders: `listing_id` (nullable), `buyer_user_id`, `product_slug`, `purchase_id`, `status` enum (`awaiting_payment`, `paid`, `intake`, `in_progress`, `questions`, `revision`, `seller_review`, `approved`, `published`, `cancelled`, `refunded`), `intake` JSONB, `revision_count`, timestamps.
- `listing_service_messages` — admin ↔ seller thread for a service order.
- Enum additions: `readiness_level`, `service_order_status`.
- Indexes: `listing_specs(listing_id)`, `listing_completeness(readiness_level)`, `listing_service_orders(status, created_at)`, partial index on `listings(host_id) where status='draft'`.
- GRANTs on every new public table (`authenticated` + `service_role`; `anon` read only on `listing_specs`/`listing_completeness`/`listing_rental_terms` scoped to publicly visible listings).
- No table is required for publish — every new table is optional-depth, so publishing never blocks on it.

## 5. Six implementation phases

**Phase 1 — Gateway + consolidation.** New `/list/start` gateway with the exact headline/body/reassurance copy and two paths (Create it myself — Free; Concierge — price read from `monetization_products`). Delete `ListingWizard.tsx` / `CreateListing.tsx`, keep redirects. Tests: gateway renders both paths with DB-driven price; every legacy route still resolves; draft resume smoke test on existing drafts.

**Phase 2 — Six-stage free flow.** Rebuild the wizard shell into What / Account / Details / Photos / Location & delivery / Confirm & publish with progressive disclosure by category and mode. Auth stage only when signed out, preserving all answers and returning to the exact next stage. Tests: category matrices (trailer hides engine/mileage; static space hides title/towing; rental vs sale fields); signed-out → auth → resume at correct stage; draft autosave.

**Phase 3 — Instant publish + copy cleanup.** Remove the vestigial `stripe` step/type/meta, all fake review/countdown language, and stale Stripe copy in `ListingPublished.tsx` (toasts at lines 195/341, `stripe-webhook` error endpoint), `List.tsx:456`, `HostOnboarding.tsx`. Keep real states (draft, paused, sold, archived, flagged, restricted, suspended, removed). Tests: publish → immediately viewable/shareable; no `pending_review` reachable from the wizard; grep guard test asserting zero active Stripe strings in listing-flow files.

**Phase 4 — Readiness system.** `listing_specs`, `listing_completeness`, suggestions table + seller-facing improvement cards, status labels, public Equipment Readiness Summary from confirmed data only, with the required disclaimer. Backfill completeness for the 85 published listings. Tests: score/label thresholds; unconfirmed suggestions never render publicly; disclaimer always present; “verified” wording never used.

**Phase 5 — Deep detail sections + guidance.** All conditional detail sections and full rental terms, each saved independently post-publish, plus `InfoTooltip` guidance (reuse `src/components/ui/info-tooltip.tsx`) beside field labels, option groups, privacy and status labels, and improvement cards. Tests: section save isolation; conditional rendering by category; keyboard + screen-reader tooltip access; requirements/public-private status visible without hovering.

**Phase 6 — Concierge service order.** Product row + admin config, PayPal one-time checkout, idempotent return/webhook handling, service order + separate draft listing, abbreviated intake, admin work queue, seller Q&A, one revision, seller approval before publication, configurable turnaround/terms. Tests: duplicate webhook produces one order; abandoned payment leaves no phantom listing; publication blocked until seller approval; no “human specialist reviewed” claim unless an admin actually completed the step.

## 6. Risks

- **Drafts (139)** — stage remapping must never lose answers; mitigate with a pure mapping function + read-only rehearsal against real draft rows before rollout.
- **Media** — image/video arrays stay untouched; cover selection writes only `cover_image_url`.
- **Auth return** — the existing `?redirect=` pattern must carry stage + draft id; regression test for OAuth (Google) round trip.
- **PayPal boost/notary** — publish-first ordering must be preserved so an abandoned payment never strands a listing.
- **Emails** — `send-listing-live-email` and admin revenue alerts must still fire exactly once on the new publish path.
- **Analytics** — existing event names should be kept and only added to, so historical funnels stay comparable.
- **RLS** — new tables must not widen access to private address or seller PII; public reads gated on `is_listing_publicly_visible`.

## 7. Contradictions found in current code

- Three creation surfaces coexist (`ListingWizard` dead, `QuickStartWizard` live, `PublishWizard` live) with `/create-listing` redirecting away from the component that still imports it.
- A `'stripe'` step remains in the `PublishStep` type, `VALID_STEPS`, and `stepMeta` while permanently filtered out.
- User-facing toasts on `ListingPublished.tsx` say “Stripe confirmed your payment” on a PayPal-only rail; `HostOnboarding.tsx` still advertises Stripe Connect payouts; `List.tsx` says “No Stripe setup required”.
- `pending_review` exists in the status enum, `publicVisibility.ts`, and journey copy (“We’re reviewing your listing”) but is never set by the wizard — a latent fake-review state.
- Equipment specs are stored as free-text checkbox labels in `amenities[]`, so nothing can be filtered, summarized, or displayed as structured data today.
- `HowItWorks*` pages state 24-hour automated payouts, which conflicts with the documented manual payout process.
