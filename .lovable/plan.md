# Reduce Booking Friction & Improve Lead Capture

Goal: convert more of the existing landing/scroll traffic into qualified leads by adding a soft, concierge-first capture flow, de-emphasizing "Book Now" in favor of lower-friction actions, splitting how-it-works by intent, and standardizing analytics events.

## 1. Lead capture: "Tell Vendibook What You Need"

Build one reusable flow used everywhere, with two surfaces:

- **`<TellVendibookButton>`** — branded CTA that opens the modal (variants: primary / glass / inline-link).
- **`<TellVendibookModal>`** — multi-step form using the project's Satin Lux dialog style.

Form fields (all required unless noted):
1. Intent — rent · buy · list · sell (segmented control)
2. Category — food truck · food trailer · commercial kitchen · vendor space
3. City / State (Google Places autocomplete, reusing `LocationSearchInput`)
4. Timeline — ASAP · within 2 weeks · within 1 month · 1–3 months · just exploring
5. Budget range — preset bands per intent (e.g. rentals $/day, sales $ total)
6. Name, Email, Phone (Phone optional)
7. Notes (optional)

Trust line shown above CTA on every surface:
> "Need help? Vendibook can help confirm availability, pricing, and next steps before you book."

Success state: confirmation with "We'll text/email you within 1 business hour" + link back to browse.

**Storage:** extend `public.asset_requests` (already holds city/asset_type/budget/notes/email/phone). Add columns: `intent text`, `name text`, `timeline text`, `source_page text`, `listing_id uuid null`. Keep existing RLS (anyone can insert; admins + owner can read). One migration.

**Placements:**
- Homepage Hero — secondary CTA "Tell Vendibook what you need" under the search bar.
- Listing detail — new above-the-fold **Concierge Help Box** (see §2).
- Search page — persistent right-rail / sticky card "Can't find it? Tell us."
- Empty search results — primary action becomes the lead form (replace current `EmptyStateEmailCapture` CTA).
- How-it-works — embedded as Step-3 CTA on both paths.
- `RentMyCommercialKitchen.tsx` and `SellMyFoodTruck.tsx` — replace existing inline forms with the unified modal trigger so leads land in one table.

## 2. Listing page softer CTAs

Above the fold, add **`<ListingConciergeBox>`**:

> "Want help with this listing? Vendibook can help confirm availability, answer basic questions, and coordinate next steps with the host."

Buttons:
- **Check Availability** (primary) — opens date picker; for instant-book listings this still flows to checkout, otherwise sends a structured availability inquiry to the host (`listing_leads` insert with `source='check_availability'`).
- **Ask Vendibook for Help** (secondary) — opens the Tell-Vendibook modal pre-filled with listing id, category, city.

**CTA hierarchy changes** in `BookingWidget`, `RentalBookingWidget`, and `StickyMobileCTA`:
- If `instant_book === true` → keep "Book Now" primary (orange).
- Otherwise → "Check Availability" becomes primary; "Request to Book" demoted to ghost/secondary; "Ask a Question" gains equal weight.
- Owner banner unchanged.

## 3. How-it-works split by intent

Rework `/how-it-works` (`src/pages/HowItWorks.tsx`):

- Replace current hero with a two-card chooser:
  1. **"I want to find or book something"** → expands to renter/buyer 3-step flow (Search → Check Availability / Ask Vendibook → Book securely). CTA: Browse + Tell Vendibook.
  2. **"I want to list or sell something"** → expands to host/seller 3-step flow (List in minutes → Verify → Get paid). CTA: Start a Listing + Talk to Concierge.
- Keep existing deeper pages (`/how-it-works-host`, `/how-it-works-seller`) as "Learn more" links from each path.
- Maintain trust strip + Satin Lux styling already used on the page.

## 4. Standardized tracking events

Add `src/lib/leadTracking.ts` exporting `trackLeadEvent(name, payload)` that writes to both `analytics_events` (via existing `trackEventToDb`) and `window.gtag`. Wire these ten events:

| Event | Fired from |
|---|---|
| `search_performed` | `SearchBar` submit, header search, hero search |
| `listing_card_click` | `ListingCard` link click |
| `check_availability_click` | new Concierge Box + booking widgets |
| `contact_host_click` | `InquiryForm`, `EnhancedInquiryForm`, host card |
| `lead_form_started` | Tell-Vendibook modal open |
| `lead_form_submitted` | Tell-Vendibook successful insert |
| `booking_request_started` | Booking wizard step 1 mount |
| `booking_request_submitted` | Booking wizard final submit |
| `host_listing_started` | `CreateListing` / wizard step 1 mount |
| `host_listing_published` | publish success in listing wizard |

Each payload includes `route`, `listing_id?`, `city?`, `category?`, `intent?`.

## Technical notes

- **New files:**
  - `src/components/lead/TellVendibookModal.tsx`
  - `src/components/lead/TellVendibookButton.tsx`
  - `src/components/lead/ConciergeTrustLine.tsx`
  - `src/components/listing-detail/ListingConciergeBox.tsx`
  - `src/lib/leadTracking.ts`
- **Edited files:** `Hero.tsx`, `Browse.tsx` / `Search.tsx`, `EmptyStateEmailCapture.tsx`, `HowItWorks.tsx`, `RentMyCommercialKitchen.tsx`, `SellMyFoodTruck.tsx`, `BookingWidget.tsx`, `RentalBookingWidget.tsx`, `StickyMobileCTA.tsx`, `SearchBar.tsx`, `ListingCard.tsx`, `CreateListing.tsx` / wizard publish handler.
- **Migration:** add `intent`, `name`, `timeline`, `source_page`, `listing_id` to `asset_requests`; index `(intent, created_at desc)`.
- Reuse existing `SmartConciergeModal` styling tokens; do not replace its exit-intent behavior.
- All copy and visuals stay on Satin Lux: charcoal `#08080a`, orange-only CTAs, hairline borders, glass cards.
- No business logic in commissions/payments touched.

## Out of scope
- Email/SMS routing of new leads (existing admin notification path already covers `asset_requests` inserts).
- Redesign of dashboards or checkout.
- Any change to Stripe/escrow flow.
