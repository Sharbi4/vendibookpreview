
# Turo/Airbnb-Style Listing Detail Page Transformation

## Executive Summary

Transform the Listing Detail page from an "Information Hiding" pattern (modals, buttons, hidden data) to a "Direct Manipulation" pattern (visible calendar, inline date pickers, instant pricing updates). This follows the Turo/Airbnb conversion optimization strategy: "What You See Is What You Pay."

---

## Current State Analysis

### What Exists
| Component | Current Behavior | Issue |
|-----------|-----------------|-------|
| `EnhancedBookingSummaryCard` | Shows price, requires "Check availability" click to open modal | Hides calendar, extra click = friction |
| `RequestDatesModal` | Full calendar with hourly/daily selection | Good functionality, but hidden in modal |
| `AvailabilityCalendarDisplay` | Exists but not used in main layout | Wasted component - should be inline |
| `EnhancedQuickHighlights` | Shows some specs, but only for sale listings | Dimensions/power hidden for rentals |
| `PricingSection` | Static price display | No live price calculation |

### Key Data Available
- `price_daily`, `price_weekly`, `price_hourly` - Full pricing tiers
- `hourly_enabled`, `daily_enabled` - Rental mode toggles
- `useHourlyAvailability` hook - Complete availability logic
- `useBlockedDates` hook - Blocked/booked/buffer dates
- Amenities with power specs: `generator`, `shore_power`, `hot_water_heater`
- Physical specs: `length_inches`, `width_inches`, `height_inches`, `weight_lbs`

---

## Phase 1: Inline Booking Widget (Right Column)

### 1.1 Create `BookingWidget.tsx`

Replace `EnhancedBookingSummaryCard` with a new component that exposes date/time selection directly (no modal required for initial interaction).

**Structure:**
```text
┌─────────────────────────────────────────┐
│  $150 /day                    ⚡ Instant│
│  $900/week for 7+ days                  │
├─────────────────────────────────────────┤
│  ┌─────────────┬──────────────┐        │
│  │ CHECK-IN    │  CHECK-OUT   │        │
│  │ Feb 10      │  Feb 14      │ ▾      │
│  └─────────────┴──────────────┘        │
│                                         │
│  ┌─────────────┬──────────────┐        │
│  │ START TIME  │  END TIME    │ (hourly)│
│  │ 10:00 AM    │  6:00 PM     │ ▾      │
│  └─────────────┴──────────────┘        │
├─────────────────────────────────────────┤
│  4 days × $150                    $600  │
│  Service fee                       $77  │
│  ─────────────────────────────────────  │
│  Total                            $677  │
├─────────────────────────────────────────┤
│  [        Request to Book         ]     │
│                                         │
│  You won't be charged yet               │
├─────────────────────────────────────────┤
│  🛡️ 100% money-back guarantee          │
└─────────────────────────────────────────┘
```

**Key Features:**
1. **Inline Popover Calendars** - Click date fields to open inline calendar popovers (not full modals)
2. **Live Price Calculation** - Uses existing `calculateRentalFees` as dates change
3. **Time Selectors** - Only shown if `hourly_enabled` is true
4. **Supports Both Modes** - Rental (dates/times) vs Sale (Buy Now / Make Offer)

**Technical Implementation:**
- Uses `Popover` with `Calendar` component for date selection
- Leverages existing `useHourlyAvailability` and `useBlockedDates` hooks
- Calculates fees with `calculateRentalFees` from `lib/commissions.ts`
- Preserves existing modal as fallback for complex hourly scheduling

### 1.2 Update Sale Mode Widget

For sale listings, the widget shows:
- Price prominently
- Fulfillment options (pickup, delivery, freight)
- "Buy Now" + "Make Offer" CTAs
- Freight estimate integration

---

## Phase 2: Inline Availability Calendar (Left Column)

### 2.1 Create `InlineAvailabilityCalendar.tsx`

Add a 2-month calendar view directly in the main content area (below description, above reviews).

**Structure:**
```text
┌─────────────────────────────────────────────────────────────┐
│  Availability                                               │
│  Prices may vary by day. Select dates on the right to book. │
├─────────────────────────────────────────────────────────────┤
│  ◄ February 2026          March 2026 ►                      │
│  ┌───────────────────┐   ┌───────────────────┐             │
│  │ S  M  T  W  T  F  S│   │ S  M  T  W  T  F  S│             │
│  │       1  2  3  4  5│   │                   1│             │
│  │ 6  7  8  9 10 11 12│   │ 2  3  4  5  6  7  8│             │
│  │13 14 15 16 17 18 19│   │ 9 10 11 12 13 14 15│             │
│  │20 21 22 23 24 25 26│   │16 17 18 19 20 21 22│             │
│  │27 28               │   │23 24 25 26 27 28 29│             │
│  └───────────────────┘   │30 31              │             │
│                          └───────────────────┘             │
│                                                             │
│  Legend: ◯ Available  ● Booked  ◐ Limited  ○ Blocked       │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
1. **Dual-Month View** - Airbnb-style side-by-side months on desktop
2. **Color-Coded Status** - Uses existing `AvailabilityCalendarDisplay` status logic
3. **Responsive** - Single month on mobile
4. **Read-Only** - For scanning availability; selection happens in right widget
5. **Tooltips** - Hover for detailed status

**Technical Implementation:**
- Reuses logic from existing `AvailabilityCalendarDisplay`
- Uses `useBlockedDates` hook for booked/blocked/buffer dates
- Navigation with `addMonths`/`subMonths` from date-fns
- Only renders for rental listings (`mode === 'rent'`)

---

## Phase 3: Technical Specifications Grid

### 3.1 Create `TechSpecsGrid.tsx`

Expose the "hidden" wizard data (dimensions, power, water) in an icon-rich, scannable grid.

**Structure:**
```text
┌─────────────────────────────────────────────────────────────┐
│  Technical Specifications                                   │
├──────────────────┬──────────────────┬──────────────────┬────┤
│  📏 Dimensions   │  ⚖️ Weight       │  ⚡ Power        │  💧│
│  16'L × 8'W      │  8,500 lbs       │  Generator + 50A │  Hot│
├──────────────────┴──────────────────┴──────────────────┴────┤
└─────────────────────────────────────────────────────────────┘
```

**Data Mapping:**
| Source Field | Display |
|--------------|---------|
| `length_inches`, `width_inches`, `height_inches` | "16'L × 8'W × 10'H" |
| `weight_lbs` | "8,500 lbs" |
| `amenities.includes('generator')` | "Generator Included" |
| `amenities.includes('shore_power')` | "+ 50A Shore Power" |
| `amenities.includes('hot_water_heater')` | "Hot/Cold Water" |

**Show For:**
- Food trucks and food trailers (categories with physical specs)
- Both rental and sale modes

---

## Phase 4: Update ListingDetail.tsx Layout

### 4.1 Restructure Content Sections

**New Order (Left Column):**
1. Title & Meta (unchanged)
2. Host Snippet (unchanged)
3. **Technical Specifications** (NEW - `TechSpecsGrid`)
4. Description (unchanged)
5. Amenities/What's Included (unchanged)
6. **Inline Availability Calendar** (NEW - rentals only)
7. Host Card (unchanged)
8. Reviews (unchanged)
9. Policies (unchanged)

**Right Column:**
1. **BookingWidget** (replaces `EnhancedBookingSummaryCard` and `EnhancedInquiryForm`)

### 4.2 Integration Points

```tsx
// Rental listings
{isRental ? (
  <BookingWidget 
    listing={listing}
    host={host}
    isOwner={isOwner}
  />
) : (
  <BookingWidget 
    listing={listing}
    host={host}
    isOwner={isOwner}
    mode="sale"
  />
)}
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/listing-detail/BookingWidget.tsx` | Create | New unified booking/inquiry widget with inline date selection |
| `src/components/listing-detail/InlineAvailabilityCalendar.tsx` | Create | 2-month calendar for main content area |
| `src/components/listing-detail/TechSpecsGrid.tsx` | Create | Physical/power specifications grid |
| `src/pages/ListingDetail.tsx` | Modify | Integrate new components, restructure layout |
| `src/components/listing-detail/StickyMobileCTA.tsx` | Modify | Update to use BookingWidget date state |

---

## Component Interactions

```text
┌─────────────────────────────────────────────────────────────┐
│                      ListingDetail.tsx                      │
├─────────────────────────────────────────────────────────────┤
│  Left Column                    │  Right Column (Sticky)    │
│  ────────────────────           │  ─────────────────────    │
│  ┌─────────────────┐            │  ┌──────────────────┐    │
│  │ TechSpecsGrid   │            │  │  BookingWidget   │    │
│  │ (dimensions,    │            │  │  - Date popovers │    │
│  │  power, weight) │            │  │  - Time select   │    │
│  └─────────────────┘            │  │  - Live pricing  │    │
│                                 │  │  - Book CTA      │    │
│  ┌─────────────────┐            │  └──────────────────┘    │
│  │ InlineCalendar  │            │                          │
│  │ (read-only,     │            │                          │
│  │  2-month view)  │            │                          │
│  └─────────────────┘            │                          │
└─────────────────────────────────────────────────────────────┘
                          ▲
                          │ Uses
                          ▼
         ┌────────────────────────────────────┐
         │         useHourlyAvailability      │
         │         useBlockedDates            │
         │         calculateRentalFees        │
         └────────────────────────────────────┘
```

---

## Technical Details

### BookingWidget Props
```typescript
interface BookingWidgetProps {
  listing: Listing;
  host: HostProfile | null;
  isOwner: boolean;
}
```

### InlineAvailabilityCalendar Props
```typescript
interface InlineAvailabilityCalendarProps {
  listingId: string;
  availableFrom?: string | null;
  availableTo?: string | null;
}
```

### TechSpecsGrid Props
```typescript
interface TechSpecsGridProps {
  category: ListingCategory;
  lengthInches?: number | null;
  widthInches?: number | null;
  heightInches?: number | null;
  weightLbs?: number | null;
  amenities?: string[];
}
```

---

## Key Hooks Reuse

The implementation leverages existing, battle-tested hooks:

1. **`useHourlyAvailability`** - Provides:
   - `settings` (priceHourly, hourlyEnabled, dailyEnabled, etc.)
   - `getDayAvailabilityInfo(date)` - Returns status for calendar coloring
   - `getAvailableWindowsForDate(date)` - Time slots for hourly booking
   - `calculateHourlyPrice(hours)` / `calculateDailyPrice(days)`

2. **`useBlockedDates`** - Provides:
   - `blockedDates`, `bookedDates`, `bufferDates`
   - `isDateUnavailable(date)` - For disabling calendar dates

3. **`calculateRentalFees(basePrice)`** - Returns:
   - `{ subtotal, renterFee, hostFee, customerTotal, hostReceives, platformFee }`

---

## Mobile Considerations

1. **BookingWidget** - Full-width on mobile, sticky at bottom option
2. **InlineAvailabilityCalendar** - Single month on mobile, horizontal scroll for dual
3. **TechSpecsGrid** - 2-column grid on mobile (vs 4 on desktop)
4. **StickyMobileCTA** - Remains as footer CTA, syncs with BookingWidget state

---

## Benefits

| Metric | Before | After |
|--------|--------|-------|
| Clicks to see availability | 1 (open modal) | 0 (inline calendar) |
| Clicks to see pricing | 2 (select dates in modal) | 0 (live update on date change) |
| Tech specs visibility | Hidden in description | Prominent icon grid |
| Conversion friction | High (modal-heavy) | Low (direct manipulation) |
| Mobile UX | Modal covers screen | Inline + sticky CTA |

---

## Implementation Order

1. Create `TechSpecsGrid.tsx` component
2. Create `InlineAvailabilityCalendar.tsx` component
3. Create `BookingWidget.tsx` component
4. Update `ListingDetail.tsx` to integrate all three
5. Update `StickyMobileCTA.tsx` for state sync
