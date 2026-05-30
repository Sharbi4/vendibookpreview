# Conversion Sprint — Sequenced

Goal: stop guessing. Make the funnel measurable, then fix the two pages where intent is leaking (listing detail + homepage), then clean the reports.

Order matters. Step 1 ships first so steps 2–3 can be judged against real numbers next week.

---

## Step 1 — Finish the tracking events (measure first)

Wire the remaining 6 events through the existing `src/lib/leadTracking.ts` utility so GA4 + `asset_requests`/analytics tables get consistent data. `lead_form_started` and `lead_form_submitted` already fire from `TellVendibookModal`. `listing_card_click`, `search_performed`, `contact_host_click` were wired last turn — verify and extend.

Events to wire and where:

- `search_performed` — also fire from `HeaderSearchField.tsx` and the homepage hero search (currently only `SearchBar.tsx`). Include `{ query, city, category, results_count }`.
- `listing_card_click` — verify firing in `ListingCard.tsx`; add `{ listing_id, position, source: 'search'|'home'|'related' }`.
- `check_availability_click` — fire from `ListingConciergeBox` primary CTA, `BookingWidget.tsx`, `RentalBookingWidget.tsx`, `StickyMobileCTA.tsx`.
- `contact_host_click` — verify in `InquiryForm.tsx`; add to `EnhancedInquiryForm` and the "Ask a Question" CTA in concierge box.
- `booking_request_started` — fire at booking wizard step 1 mount in the booking flow.
- `booking_request_submitted` — fire on successful submit (before Stripe redirect).

No schema change needed — `asset_requests` already has `intent` + `source_page`.

## Step 2 — Listing page above-the-fold

The /listing/fc44… data (93.9% bounce, 2.1s engagement) means visitors don't see a low-friction next step. `ListingConciergeBox` exists but `BookingWidget` still leads with "Book Now".

Changes (frontend only):

- `BookingWidget.tsx` and `RentalBookingWidget.tsx`: for **non-instant-book** listings, demote "Request to Book" to ghost/secondary and promote "Check Availability" (scroll to date picker + open concierge if dates unavailable) as the primary orange CTA. "Ask a Question" gets equal weight to the secondary.
- `StickyMobileCTA.tsx`: same hierarchy for non-instant-book.
- Instant-book and owner-banner flows unchanged.
- Add a one-line trust strip directly under the concierge box headline: "Vendibook can confirm availability, pricing, and next steps before you book." (already drafted in `ListingConciergeBox` — verify copy matches).
- Above-the-fold: ensure first photo + title + price + concierge box render before any below-fold lazy work.

## Step 3 — Homepage funnel

Homepage holds attention (39s) but key-event rate is 0.13%. Problem: too many competing CTAs, no single forced next step.

Changes (frontend only, `src/pages/Index.tsx` + `src/components/home/hero/*`):

- Hero collapses to one primary action: **search bar** (existing) with `TellVendibookButton` directly under it as the soft alternative ("Not sure what you need? Tell Vendibook.").
- Remove or demote secondary hero CTAs that compete (audit `HeroValueProp`, `HeroActions`).
- Add a thin trust strip under hero: "1,200+ operators · Verified hosts · 24h payouts" (use existing copy/data; no new claims).
- Below hero: keep category tiles but ensure each tile click fires `search_performed` with the chosen category prefilled.
- The "List or sell" path stays present but visually secondary (one card, not a section equal to renter path).

## Step 4 — Traffic hygiene

- Trace `?forceHideBadge=true`: grep the codebase for `forceHideBadge` to identify origin (likely embed/widget). Document where it's emitted in a code comment + memory note. No GA filter changes from code — surface findings so the user can exclude in GA.
- `/feedback?token=…`: these are single-action pages; add `<meta name="robots" content="noindex" />` via the existing helmet pattern on the feedback page and confirm `trackLeadEvent` is **not** fired there so they stop polluting funnel reports.

---

## Technical notes

- All event payloads go through `trackLeadEvent(name, payload)` in `src/lib/leadTracking.ts` — no new tracking utilities.
- No DB schema changes. No edge function changes. No Stripe / checkout / auth logic touched.
- Booking-widget refactor is presentation-only: CTA order, variant, and label. The underlying `onBook` / `onRequest` handlers stay identical.
- `BookingWidget.tsx` is large (~1000 lines); changes are scoped to the action-button block + a single `isInstantBook` branch. No structural refactor.
- Memory updates after build: add a short note under `mem://features/booking-friction-reduction-v1` capturing the non-instant-book CTA hierarchy rule.

## Out of scope

- Dashboard, checkout, Stripe webhooks, escrow, email templates, auth flows.
- New backend tables or RLS changes.
- Ads, SEO content, blog.
- Any redesign of pages other than homepage hero and listing detail above-the-fold.

## Definition of done

- All 8 lead events fire and appear in `asset_requests`/GA4 within 24h of deploy.
- Listing detail non-instant-book pages lead visually with Check Availability + Ask a Question; Book Now is secondary.
- Homepage hero has exactly one primary CTA (search) + one soft CTA (Tell Vendibook).
- `/feedback?token=` is noindex and untracked.
- `forceHideBadge` origin documented.
