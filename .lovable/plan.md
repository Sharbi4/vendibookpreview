# Rental Availability & Booking Entry Redesign

Turn the card → overlay → booking handoff into a real booking surface that mirrors the listing-page widget, blocks paid/approved/buffered time correctly, and prevents double bookings server-side.

---

## 1. Card micro-action ("View availability →")

**File:** `src/components/listing/ListingCard.tsx`

- For `listing.mode === 'rent'`, change the CTA label from **"Check dates"** to **"View availability →"** and rename the event to `listing_view_availability_click` (sale path unchanged — still "Start purchase").
- Keep the existing inline-text styling already in place (13px, #f97316, arrow translates 4px on hover, no background/border/pill, `e.stopPropagation()`). No structural changes needed.
- Remove the now-dead `<AvailabilityCalendarModal>` mount (`showCalendar` state) — superseded by the overlay.

---

## 2. Shared `RentalAvailabilityPicker` component (single source of truth)

**New file:** `src/components/listing/RentalAvailabilityPicker.tsx`

Extract the booking-engine logic so the card overlay and the listing-detail widget render the **exact same** availability surface.

Props:

```text
listingId, listingTitle, category, instantBook,
priceHourly, priceDaily, priceWeekly, priceMonthly,
totalSlots, slotNames, availableFrom, availableTo,
source: 'listing_card_availability_overlay' | 'listing_detail_widget',
onClose?: () => void
```

Internal state: `mode ('hourly' | 'daily')`, `startDate`, `endDate`, `hourlySelections` (`{ [yyyy-MM-dd]: string[] }`), `selectedSlotNumber`, `selectedSlotCount`.

Data: reuses `useHourlyAvailability(listingId)` and `useBlockedDates({ listingId })` — no new fetch logic. Both hooks already pull listing settings, blocked dates, blocked times, buffer days, and paid/approved/pending-paid/instant-book bookings; we preserve that contract.

Sub-sections rendered top-to-bottom:

1. **Mode toggle** — only shown when both `hourlyEnabled` and `dailyEnabled` are true. Labels: `Hourly` / `Daily`. Tracked as `availability_mode_changed`.
2. **Month calendar** — built on `getDayAvailabilityInfo(date)`:
   - `available` → dark cell, white text
   - `limited` → amber dot/ring (partial slots or some hours booked)
   - `booked` / `blocked` / past / outside-window → muted, disabled
   - `today` → thin orange ring when available
   - selected day → orange ring; selected daily range → orange fill
3. **Hourly slot strip** (only in hourly mode after day selected) — uses `getAvailableWindowsForDate(date)`, renders one chip per hour inside each window. Clicks toggle the hour in `hourlySelections[dateKey]`; multiple days supported (matches the listing-page widget's `hourlyData` encoding). Unavailable hours appear muted/disabled. Shows `Minimum booking time: N hours`.
4. **Daily range summary** (daily mode) — `May 31 · 1 day` or `May 31 → Jun 3 · 4 days`. Shows `Minimum booking time: N day(s)`.
5. **Slot selector** — only when `totalSlots > 1`. Reuses logic from `RentalBookingWidget` (slot number + slot count).
6. **Price preview** — uses `calculateRentalFees` from `src/lib/commissions.ts`. Shows base × units + service fee + estimated total. Daily mode shows tiered weekly/monthly breakdown when applicable.
7. **Primary CTA**:
   - No date → `Select a date to continue` (disabled)
   - Hourly mode, no hours → `Select a time to continue` (disabled)
   - Ready + `instant_book` → `Book Now`
   - Ready + standard → `Start Booking Request`
   - On click → emits `booking_request_started` then `navigate(\`/book/\${listingId}?\${params}\`)` using the **same URLSearchParams shape** as `RentalBookingWidget.handleContinue` (`start`, `end`, `hours`, `hourlyData`, optional `slot`, `slotName`, `slotCount`).
8. **Secondary CTA** — `View Full Listing` link only. No other secondary actions.

Language rule: replace every "minimum stay" / "stay" / "nights" string with **"Minimum booking time"**. No lodging language anywhere in the new component.

---

## 3. Rewire the card overlay around the shared picker

**File:** `src/components/listing/ListingCardOverlay.tsx`

- Sale path (`mode === 'sale'`) is untouched.
- Rent path:
  - Headline: **"View availability"**
  - Subhead: **"Choose an available day or booking window before starting your request."**
  - Listing summary row added at top: thumbnail (cover image), title, city/state, price summary, `For Rent` badge.
  - Replace the current stat strip + `InlineAvailabilitySlotPicker` + bottom `Start Purchase Request` button with a single `<RentalAvailabilityPicker source="listing_card_availability_overlay" onClose={onClose} />`.
  - Remove the redundant `View Availability` / `Start booking` primary button at the bottom of the overlay — the picker owns the CTA. Keep only the **View Full Listing** secondary link.
  - Container preserved: `#111113` bg, `rgba(255,255,255,0.1)` border, 2px top `#f97316`, rounded-2xl, 28px desktop / 22px mobile padding, AnimatePresence (opacity 0→1, scale 0.96→1, y 8→0, 280ms ease-out / 200ms exit), backdrop click + Escape close, small ✕ close button added top-right, mobile bottom-sheet handle preserved.
- Delete now-orphan files: `src/components/listing/InlineAvailabilitySlotPicker.tsx` and `src/components/listing/AvailabilityCalendarModal.tsx`.

---

## 4. Bring the listing-detail booking widget in line

**File:** `src/components/listing-detail/RentalBookingWidget.tsx`

- Replace its hand-rolled calendar + slot UI with `<RentalAvailabilityPicker source="listing_detail_widget" ... />` so card and detail are guaranteed identical.
- Owner view, instant-book vs request CTAs, and the existing `/book/:listingId` navigation params remain.
- Update any string saying "Minimum stay" to **"Minimum booking time"**.

`src/components/listing-detail/InlineAvailabilityCalendar.tsx` becomes the read-only "availability section" on the listing page (kept), since it is a passive visualization, not a picker.

---

## 5. Booking-status & blocking truth table (frontend)

The picker treats a day/hour as unavailable when **any** of these are true (existing `useHourlyAvailability` + `useBlockedDates` already enforce this; we just preserve and document it):

| Source | Blocking rule |
|---|---|
| `booking_requests` status `approved` or `completed` | Block full range / hours |
| `booking_requests` status `pending` AND `payment_status = 'paid'` | Block (instant-book paid awaiting host) |
| `booking_requests` `is_instant_book = true` AND `payment_status = 'paid'` | Block |
| `listing_blocked_dates` | Full day blocked |
| `listing_blocked_times` | Specific hours blocked |
| `rental_buffer_days` | Pad daily ranges on both sides |
| `buffer_time_mins` | Pad hourly bookings on both sides |
| `min_notice_hours` | Block today's hours before now + N |

Daily multi-day range (e.g. June 1 → June 10) is expanded to all 10 dates. With `total_slots > 1`, slot capacity decrements per day; day is fully blocked only when **all** slots are taken. With `total_slots = 1`, day blocks immediately. Hourly bookings prefer `hourly_slots` JSONB (multi-day) and fall back to legacy `start_time`/`end_time`.

Declined / canceled / expired-hold / failed-payment / unpaid-abandoned requests do **not** block. (Already correct in `useHourlyAvailability` and `useBlockedDates` — no change.)

---

## 6. Server-side double-booking guard (new)

**New migration:** `validate_listing_availability(listing_id uuid, start_date date, end_date date, start_time time, end_time time, is_hourly boolean, hourly_slots jsonb, slot_number int)` returning `boolean` + reason. Implements the same blocking table above using `booking_requests`, `listing_blocked_dates`, `listing_blocked_times`, listing settings.

**Edge functions updated** to call it before issuing Stripe sessions:

- `supabase/functions/create-booking-hold/index.ts`
- `supabase/functions/create-checkout/index.ts`

On conflict, return HTTP 409 with code `availability_conflict`. Frontend `BookingCheckout` shows toast **"Sorry, this time is no longer available. Please choose another date or time."** and emits `availability_unavailable_conflict`.

This guarantees a stale overlay cannot create a double booking, regardless of what the renter sees.

---

## 7. Analytics

Add these `LeadEventName`s in `src/lib/leadTracking.ts` and emit from the picker / overlay:

```
listing_view_availability_click
availability_overlay_opened
availability_overlay_dismissed
availability_mode_changed
availability_date_selected
availability_time_slot_selected
availability_time_range_selected
booking_request_started
availability_overlay_view_full_listing
availability_unavailable_conflict
```

Metadata payload: `listing_id, listing_title, category, mode, price_hourly, price_daily, selected_date, selected_start, selected_end, selected_hours, selected_days, selected_slot_number, selected_slot_count, source`.

---

## 8. Technical notes

- No new data fetching layer. `useHourlyAvailability` and `useBlockedDates` are the only sources; both already scope by `listingId`, so the overlay and detail page show the exact calendar for the clicked listing.
- URL contract to `/book/:listingId` is identical to the current `RentalBookingWidget`, so `BookingCheckout` needs no parser changes.
- Fix the `t.$_Tawk.i18next is not a function` runtime error (quietly) while touching this area.
- Files created: `RentalAvailabilityPicker.tsx`, one migration, validator helper.
- Files removed: `InlineAvailabilitySlotPicker.tsx`, `AvailabilityCalendarModal.tsx`.
- Files edited: `ListingCard.tsx`, `ListingCardOverlay.tsx`, `RentalBookingWidget.tsx`, `BookingCheckout.tsx`, `create-booking-hold/index.ts`, `create-checkout/index.ts`, `leadTracking.ts`.

---

## Out of scope (flagging, not doing now)

- Search / map card availability indicators (mentioned in spec) — large surface; can be a follow-up that consumes `useHourlyAvailability` per card.
- Host calendar refactor — already uses the same tables; no functional change required for this work.
