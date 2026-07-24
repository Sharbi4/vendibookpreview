# Vendibook Journey Refinement Plan

This is large. To ship value quickly without breaking existing flows, I'll refine in three phases, layering on the primitives already in `src/components/journey/*`, `src/components/monetization/*`, and the existing edge functions. **No system is rebuilt from scratch.**

Each phase ends with a working, testable slice. You approve, I ship the next.

---

## Phase 1 — Completion Foundation (ship first)

Goal: every core journey has one primary action, visible progress, saved state, contextual trust, and a useful return-from-checkout screen.

1. **Design system pass** (no visual rebuild)
   - Audit orange usage; restrict to CTAs / active / progress / badges. Fix offenders in `UpgradePackageCards`, `ProductPricingCard`, `ProtectionOptInCard`, hero surfaces.
   - Add `src/components/journey/JourneyCard.tsx` + `SectionHeader.tsx` — neutral glass card + soft border tokens used everywhere below.

2. **Primary action hierarchy**
   - Mount `PrimaryActionBar` (already built) into: `PublishWizard` final step, `SaleCheckout`, `BookingCheckout`, `ProtectedSale`, `ListingPurchaseReviewIntake`, `PermitPathUpgrades`, `HostProPlans`, `BuyerServicesHub`.
   - Remove competing equal-weight buttons; demote to `secondary`/`tertiary` slots.

3. **Guided progress**
   - Mount `JourneyProgress` (already built) into: listing wizard, protected sale, booking checkout, sale checkout, permit path, host onboarding, service request intakes.
   - Translate technical strings via existing `friendlyStatus()` in `src/lib/journey/copy.ts` — extend the map to cover permit / service / subscription statuses.

4. **Save-and-resume**
   - Extend `ContinueSetup` (already built) to surface all resumable items on `Dashboard` via new hook `useResumableJourneys.ts` reading: draft listings, incomplete `booking_drafts`, incomplete `buyer_service_requests`, `permit_progress`, unfinished `protected_sales`, abandoned `monetization_purchases`.
   - Add "Saved just now / Xm ago" badge (uses existing `friendlySavedAt`) in wizard headers.

5. **Better empty states**
   - Replace bare empty blocks in `HostDashboard`, `ShopperDashboard`, `HostBookings`, `Favorites`, `Messages`, `Offers`, `ServicesHub` with `EmptyState` (already built) + one clear action.

6. **Checkout return flows**
   - `PurchaseReturnBanner` (exists) → route-specific post-checkout screens:
     - Seller Pro → 3-step listing improvement checklist
     - Featured / boost → return to the listing detail
     - Purchase Review → status page
     - Host Pro → availability + booking-rules setup
     - Permit upgrades → return to roadmap
   - Central helper `src/lib/monetization/returnRoutes.ts` maps `product.slug → { successPath, cancelPath, postCheckoutChecklist }`.

7. **Contextual trust** (extension of shipped `TrustModule`)
   - Add trust modules near: contact-seller CTA, make-offer modal, financing intake, inspection intake, transportation intake, subscription checkout, rental checkout deposit step.

8. **Conversion copy pass**
   - Rewrite headings/CTAs on: `HostProPlans`, `BuyerServicesHub`, `PermitPathUpgrades`, `Partners`, `ProtectionOptInCard`, `UpgradePackageCards`, following the "what/why/receive/how long/after/refundable" pattern.

9. **Conversion analytics events**
   - Extend `LeadEventName` (in `src/lib/leadTracking.ts`) with the full event list from section 22.
   - Instrument checkout start/complete/abandon, upgrade viewed/selected, offer/inspection/financing/permit steps, AI suggestion viewed/accepted/rejected.
   - Rely on existing `analytics_events` table; no schema change.

Phase 1 deliverable: unified feel across every monetized surface, resumable dashboard, real return-from-checkout, event coverage for funnels.

---

## Phase 2 — AI Assistance

Uses Lovable AI Gateway. All AI calls are server-side edge functions returning suggestions the user must approve.

1. **AI Listing Writer** — `supabase/functions/ai-listing-assist/index.ts` with actions: `title`, `description`, `summary`, `social_caption`, `equipment_categorize`, `suggest_missing`. Uses **only** user-supplied listing fields. Mounted in listing wizard as an "Ask Vendi AI" panel.
2. **AI Listing Quality Score** — deterministic scorer (`src/lib/listingQuality.ts`) + AI recommendations. Shows "78% ready" + specific missing items. Public-facing uses positive phrasing only.
3. **AI Photo Guidance** — client-side blur/darkness/dupe detection first pass (no upload cost); optional server pass for missing-angle detection. Never mutates images.
4. **AI Seller Copilot** — dashboard panel wired to `supabase/functions/ai-seller-copilot/index.ts`. Scoped to that seller's listings/offers/inquiries via RLS. Streaming chat.
5. **AI Buyer Copilot** — same pattern; scoped to buyer's saved listings and public listing data. Distinguishes stated vs inferred vs unverified.
6. **AI Permit Path Guide** — `ai-permit-guide` edge function. Uses `permit_items` + user context. Shows source + last-reviewed date. Never legal advice.
7. **AI Service Matching** — server rules + AI ranker returning top 3 services for the user's current state.
8. **AI Feedback** — thumbs up/down on every AI response → `analytics_events` with `ai_feedback` type.
9. **Human Escalation** — every AI panel has "Contact Vendibook support" fallback and auto-detects payment/dispute/fraud/safety intents to surface it prominently.

Guardrails enforced in every function: model can only see the requesting user's own data, all outputs labelled "AI-generated — review before publishing", never auto-send messages, structured output for cache-safety, rate limits per user, degrade silently if AI unavailable.

---

## Phase 3 — Optimization

1. **Next-Best-Action engine** — `src/lib/nextBestAction.ts` producing a ranked list from journey state. `NextBestAction` component (exists) becomes the primary dashboard hero, max 3 cards.
2. **Behavioral follow-up** — extend existing `send-transactional-email` idempotent path with new templates: draft-listing-nudge, unanswered-inquiry, offer-started, promotion-expiring, subscription-abandoned. Respect notification preferences and per-user per-action rate limits.
3. **Listing readiness score** — public-facing positive badges (Detailed / Highly responsive / Documents reviewed / Video available / Pricing provided) surfaced on listing cards and detail.
4. **Funnel analytics dashboard** — `AdminAnalytics.tsx` reading `analytics_events` with the funnels listed in section 22.
5. **AI performance analytics** — completion delta before/after AI use, acceptance rates, escalation rate.
6. **A/B testing scaffold** — `app_feature_flags`-backed variant assignment + event tagging.

---

## Technical notes (skimmable)

- No breaking schema changes in Phase 1. Phase 2 adds one AI edge function per copilot + `ai_suggestions` audit table. Phase 3 adds `listing_quality_snapshots`.
- All new AI code uses `LOVABLE_API_KEY` server-side, Gemini flash for high-volume tasks, structured JSON output where possible.
- Every workflow remains completable without AI. AI failures never block publish/checkout/payout.
- Accessibility + mobile: reuse `PrimaryActionBar` sticky mode; audit tap-target sizes on all new components; keep 16px min input font.

---

## What I'd like to start with

**Phase 1 in order: items 1 → 2 → 3 → 4 → 6 → 5 → 7 → 8 → 9.** That's the biggest visible completion lift with zero risk to payments.

Reply "go" (or name items to reorder / skip) and I'll ship item 1 (design-system pass + primary action mounting on `PublishWizard`, `SaleCheckout`, `BookingCheckout`) in the next turn.
