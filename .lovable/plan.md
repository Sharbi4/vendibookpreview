## Remaining work — Lead Capture & Friction Reduction

Pick up where the last turn left off. All new components already exist (`TellVendibookModal`, `TellVendibookButton`, `ListingConciergeBox`, `ConciergeTrustLine`, `leadTracking.ts`) and the `asset_requests` migration is applied.

### 1. Search page + empty states
- **`src/pages/Browse.tsx`**: add a `<TellVendibookButton variant="glass-cta">` in a sticky right-rail card titled "Can't find it? Tell us." (desktop) and a compact inline card above results on mobile. Pre-fill `defaultCity` from active filters when present.
- **`src/components/search/EmptyStateEmailCapture.tsx`**: replace the email-only CTA with `<TellVendibookButton>` as the primary action; keep the existing email field as secondary.

### 2. How-it-works split
- **`src/pages/HowItWorks.tsx`**: replace current hero with a two-card chooser:
  - "I want to find or book something" → 3 steps (Search → Check Availability / Ask Vendibook → Book securely). CTAs: Browse + Tell Vendibook.
  - "I want to list or sell something" → 3 steps (List in minutes → Verify → Get paid). CTAs: Start a Listing + Talk to Concierge.
- Keep `/how-it-works-host` and `/how-it-works-seller` reachable via "Learn more" links from each card.

### 3. Unify legacy lead forms
- **`src/pages/RentMyCommercialKitchen.tsx`** and **`src/pages/SellMyFoodTruck.tsx`**: replace existing inline form CTAs with `<TellVendibookButton defaultIntent="rent|sell" defaultCategory="commercial_kitchen|food_truck" sourcePage="…">` so all leads land in one table.

### 4. Booking widget CTA hierarchy
For non-instant-book listings only (skip when `listing.instant_book === true`):
- **`src/components/listing-detail/BookingWidget.tsx`** and **`RentalBookingWidget.tsx`**: make "Check Availability" primary (orange), demote "Request to Book" to ghost/secondary, give "Ask a Question" equal weight to the secondary action.
- **`src/components/listing-detail/StickyMobileCTA.tsx`**: mirror the same hierarchy on mobile.
- Owner banner and instant-book flows unchanged.

### 5. Wire remaining tracking events
Add `trackLeadEvent(...)` calls at these existing call sites:
| Event | File |
|---|---|
| `search_performed` | `SearchBar.tsx` submit, `HeaderSearchField.tsx`, hero search submit |
| `listing_card_click` | `ListingCard.tsx` link click |
| `check_availability_click` | new Concierge Box + both booking widgets |
| `contact_host_click` | `InquiryForm` / `EnhancedInquiryForm` submit |
| `booking_request_started` | booking wizard step 1 mount |
| `booking_request_submitted` | booking wizard final submit |
| `host_listing_started` | `CreateListing.tsx` step 1 mount |
| `host_listing_published` | publish success handler in listing wizard |

(`lead_form_started` and `lead_form_submitted` are already fired from `TellVendibookModal`.)

### Out of scope this turn
Dashboard changes, checkout flow, Stripe/escrow logic, email/SMS lead routing (existing admin pipeline already covers `asset_requests` inserts).
