

# Unified Rental Booking Flow: "Duration-First" Architecture

## Overview

This plan implements a new **"Turo/Parking" mentality** booking system that replaces the current "Hotel" approach. The key shift is from "pick dates first" to "how long do you need the space?"—allowing users to select their duration type first (Hourly vs. Daily/Weekly/Monthly), then choose dates, and finally select their specific slot.

The system will apply **consistently across all rental categories**: Vendor Spaces, Shared Kitchens, Food Trucks, and Food Trailers.

---

## Architecture Summary

```text
+------------------+     +------------------+     +------------------+
|  1. Duration     | --> |  2. Date/Time    | --> |  3. Slot         |
|     Toggle       |     |     Selection    |     |     Selection    |
+------------------+     +------------------+     +------------------+
| Hourly | Daily   |     | Calendar View    |     | Named spots or   |
|                  |     | + Time Slots     |     | numbered (1-100) |
+------------------+     +------------------+     +------------------+
```

---

## What's Changing

| Current Behavior | New Behavior |
|-----------------|--------------|
| VendorSpaceBookingModal: Calendar → Slots → Dates | Unified widget: Mode Toggle → Date → Slot |
| BookingWidget: Daily/Hourly tabs separate from vendor flow | Merged into single smart widget |
| Multiple modals for different categories | Single `RentalBookingWidget` handles all |
| Slots selected before dates | Dates selected first, slots available shown per-date |

---

## Technical Approach

### 1. Create New Unified `RentalBookingWidget` Component

**File:** `src/components/listing-detail/RentalBookingWidget.tsx`

This component replaces both `BookingWidget` (for rentals) and `VendorSpaceBookingModal` with a single, category-aware widget.

**Key Features:**
- **Mode Toggle (Hourly/Daily):** Only shown if both modes are enabled for the listing
- **Smart Date Selection:**
  - Hourly mode: Single date picker → Time slot grid
  - Daily mode: Date range picker with availability indicators
- **Slot Counter:** For multi-slot listings, shows `Slots Needed: [- 1 +]` with availability feedback
- **Dynamic Pricing:** Automatically applies tiered pricing (7 days = weekly, 30 days = monthly)
- **Slot Names Support:** Displays custom slot names (e.g., "Patio A", "Corner Spot") from `slot_names` array

**Props Interface:**
```typescript
interface RentalBookingWidgetProps {
  listing: {
    id: string;
    category: ListingCategory;
    total_slots: number;
    slot_names: string[] | null;
    price_hourly: number | null;
    price_daily: number | null;
    price_weekly: number | null;
    price_monthly: number | null;
    hourly_enabled: boolean;
    daily_enabled: boolean;
    instant_book: boolean;
    operating_hours_start: string | null;
    operating_hours_end: string | null;
  };
  isOwner: boolean;
  onBook: (bookingData: BookingPayload) => void;
}
```

---

### 2. Booking Flow Steps

**Step 1: Duration Mode Selection**
- Segmented control: `Hourly` | `Daily/Weekly`
- Only shows toggle if `hourly_enabled && daily_enabled`
- Defaults to hourly if only hourly is enabled

**Step 2: Date/Time Selection**

For **Hourly Mode:**
- Single date picker with availability indicators
- Grid of available time slots for selected date (based on `operating_hours_start/end`)
- Multi-select enabled: users can tap multiple 1-hour slots
- Shows slot availability per hour (e.g., "3/5 spots available")

For **Daily Mode:**
- Date range picker (start → end)
- Calendar shows slot availability per day
- Inclusive day counting (same start/end = 1 day)

**Step 3: Slot Selection (Multi-Slot Listings Only)**
- If `total_slots > 1`: Show slot counter with named slots dropdown
- Allow selecting multiple slots (e.g., "I have 2 trucks")
- Real-time availability check against `booking_requests` table

---

### 3. Pricing Logic Implementation

The tiered pricing already exists in `calculateTieredPrice()` and will be reused:

```typescript
// Pricing hierarchy (highest tier wins for duration)
if (days >= 30 && priceMonthly) {
  // Apply monthly rate for 30-day chunks
}
if (remaining >= 7 && priceWeekly) {
  // Apply weekly rate for 7-day chunks
}
// Remaining days at daily rate
```

For hourly bookings:
```typescript
total = selectedHours * priceHourly * numberOfSlots;
```

---

### 4. Component Integration Points

**ListingDetail.tsx Changes:**
- Replace `BookingWidget` with `RentalBookingWidget` for rental listings
- Pass full listing object with slot/pricing data
- Remove conditional VendorSpaceBookingModal opening

**StickyMobileCTA.tsx Changes:**
- Open `RentalBookingWidget` in modal mode for mobile
- Reuse same component logic for consistency

**AvailabilitySection.tsx Changes:**
- Remove separate `VendorSpaceBookingModal` import
- Use unified modal approach

---

### 5. Database Considerations

**No schema changes required.** The existing structure supports this:

- `listings.total_slots`: Capacity (1-100)
- `listings.slot_names`: Array of custom names
- `listings.price_hourly/daily/weekly/monthly`: All pricing tiers
- `listings.hourly_enabled/daily_enabled`: Mode toggles
- `listings.operating_hours_start/end`: Business hours
- `booking_requests.slot_number/slot_name`: Per-booking slot tracking

---

### 6. Files to Create/Modify

| Action | File | Description |
|--------|------|-------------|
| **Create** | `src/components/listing-detail/RentalBookingWidget.tsx` | New unified booking widget |
| **Modify** | `src/pages/ListingDetail.tsx` | Replace BookingWidget with new component |
| **Modify** | `src/components/listing-detail/StickyMobileCTA.tsx` | Use RentalBookingWidget for mobile |
| **Modify** | `src/components/listing-detail/AvailabilitySection.tsx` | Simplify to use unified approach |
| **Delete** (optional) | `src/components/listing-detail/VendorSpaceBookingModal.tsx` | After confirming new widget works |

---

## User Experience Flow

**For a Vendor Space with Hourly + Daily + 5 Slots:**

1. User lands on listing → sees widget with `Hourly | Daily` toggle
2. Selects "Hourly" → Calendar appears with slot availability badges
3. Picks date (e.g., "Sat, Feb 15") → Time slot grid appears (9AM-10PM)
4. Taps multiple slots (11AM, 12PM, 1PM) = 3 hours selected
5. If multi-slot: adjusts "Slots Needed" from 1 → 2
6. Sees live price: `$25/hr × 3 hrs × 2 slots = $150 + $19.35 fee = $169.35`
7. Taps "Reserve 3 Hours" → navigates to `/book/:id` with params

**For a Food Truck Rental (Single Slot, Daily Only):**

1. User sees simplified widget (no toggle, no slot counter)
2. Picks start/end dates → Tiered pricing auto-calculates
3. Example: 12 days = 1 week @ $500 + 5 days @ $100 = $1,000
4. Taps "Reserve 12 Days" → checkout flow

---

## Edge Cases Handled

- **Single slot listings:** Hide slot counter, simplify UI
- **Hourly-only listings:** Default to hourly mode, hide toggle
- **Daily-only listings:** Default to daily mode, hide toggle
- **Operating hours respect:** Time slots generated within host's hours
- **Buffer time:** Applies between hourly bookings per existing logic
- **Same-day booking:** Respects `min_notice_hours` setting

