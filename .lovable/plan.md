
# Plan: Update Search & Availability Logic for Hourly Bookings

## Overview
The current search and availability logic doesn't properly account for the new multi-day hourly booking system. This plan updates both the server-side search function and client-side availability hooks to correctly handle:
- Multi-day hourly bookings (stored in `hourly_slots` column)
- Blocked time slots (from `listing_blocked_times` table)
- Multi-slot capacity (listings with multiple vendor spaces)

---

## Current Issues

### 1. Search Function (`search-listings`)
- Currently marks a listing as unavailable if ANY booking overlaps with the search date range
- Doesn't check multi-slot capacity (a 5-slot venue shouldn't be "unavailable" if only 1 slot is booked)
- Doesn't distinguish between hourly and daily bookings
- Doesn't consider that hourly bookings only block specific hours, not the full day

### 2. `useBlockedDates` Hook
- Only fetches daily booking date ranges
- Doesn't query `hourly_slots` column for multi-day hourly bookings
- Doesn't fetch blocked time slots from `listing_blocked_times` table
- Treats all bookings as full-day blockers

### 3. `useListingAvailability` Hook
- Doesn't integrate with hourly booking data for slot availability calculations

---

## Implementation Plan

### Step 1: Update `search-listings` Edge Function
**File:** `supabase/functions/search-listings/index.ts`

Changes:
- Fetch `total_slots` for each listing to support capacity-based availability
- When checking booking overlap, count slots used vs total slots
- For hourly-only listings, don't mark as unavailable just because of hourly bookings (they may have other hours free)
- Add optional `is_hourly_search` parameter for future hourly search functionality

```text
Current Logic:
  booking overlaps date range → listing unavailable

New Logic:
  1. Fetch total_slots for all listings
  2. For each listing with overlapping bookings:
     - Count slots occupied by bookings
     - If occupied_slots >= total_slots → mark unavailable
     - Otherwise → still available (partial capacity)
  3. For hourly-enabled listings:
     - If ONLY hourly bookings exist → listing remains available (can book other hours)
```

### Step 2: Update `useBlockedDates` Hook
**File:** `src/hooks/useBlockedDates.ts`

Changes:
- Fetch `hourly_slots` column for hourly bookings
- Fetch blocked time slots from `listing_blocked_times` table
- Add new methods:
  - `isHourBlocked(date, hour)` - checks if specific hour is blocked
  - `getBlockedHoursForDate(date)` - returns list of blocked hours
- Keep existing `isDateUnavailable` but make it smarter (a date with partial hourly bookings isn't fully unavailable)

### Step 3: Update `useListingAvailability` Hook
**File:** `src/hooks/useListingAvailability.ts`

Changes:
- Fetch `hourly_slots` for existing bookings
- Update `getSlotsBookedForDate` to also count slots with hourly bookings
- Add method to check hourly availability per slot

### Step 4: Update Availability Calendar Display
**File:** `src/components/listing-detail/AvailabilityCalendarDisplay.tsx`

Changes:
- Show partial availability indicators for dates with some hours booked
- Add visual distinction for hourly vs daily availability
- Use `useHourlyAvailability` hook for hourly-enabled listings

---

## Technical Details

### Search Function Changes

```text
// Fetch slots capacity with listings
.select('*, total_slots')

// Enhanced availability check
const occupiedSlotsByListing = new Map<string, number>();

bookings.forEach(b => {
  const current = occupiedSlotsByListing.get(b.listing_id) || 0;
  // For hourly bookings, check if they actually overlap by date AND have slots on those dates
  if (b.is_hourly_booking && b.hourly_slots) {
    // Only count if hourly_slots have dates in the search range
    const hasOverlap = b.hourly_slots.some(s => 
      s.date >= start_date && s.date <= end_date && s.slots.length > 0
    );
    if (hasOverlap) {
      occupiedSlotsByListing.set(b.listing_id, current + 1);
    }
  } else {
    // Daily booking
    occupiedSlotsByListing.set(b.listing_id, current + 1);
  }
});

// Mark unavailable only if fully booked
listings.forEach(listing => {
  const occupied = occupiedSlotsByListing.get(listing.id) || 0;
  if (occupied >= listing.total_slots) {
    unavailableListingIds.add(listing.id);
  }
});
```

### useBlockedDates Changes

```text
// Updated query for booking data
.select('start_date, end_date, status, payment_status, is_hourly_booking, hourly_slots, slot_number')

// New: Fetch blocked time slots
const { data: blockedTimes } = await supabase
  .from('listing_blocked_times')
  .select('blocked_date, start_time, end_time')
  .eq('listing_id', listingId);

// New method for hourly checking
const isHourBlocked = (date: Date, hour: string): boolean => {
  const dateStr = format(date, 'yyyy-MM-dd');
  
  // Check blocked time slots
  const hasBlockedTime = blockedTimeSlots.some(t => 
    t.blocked_date === dateStr && 
    hour >= t.start_time && hour < t.end_time
  );
  if (hasBlockedTime) return true;
  
  // Check hourly bookings
  return bookings.some(b => {
    if (!b.is_hourly_booking) return false;
    if (b.hourly_slots) {
      const daySlots = b.hourly_slots.find(s => s.date === dateStr);
      return daySlots?.slots.includes(hour) ?? false;
    }
    return false;
  });
};
```

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/search-listings/index.ts` | Add capacity-aware availability, handle hourly bookings |
| `src/hooks/useBlockedDates.ts` | Fetch hourly_slots, blocked_times; add hourly checking methods |
| `src/hooks/useListingAvailability.ts` | Add hourly-aware slot availability calculation |
| `src/components/listing-detail/AvailabilityCalendarDisplay.tsx` | Add partial availability indicators |

---

## Expected Behavior After Implementation

### Search Results
- A venue with 10 slots shows as available even if 3 are booked
- A listing with only hourly bookings shows as available (can book other hours)
- A listing fully booked for all slots shows as unavailable

### Availability Calendar
- Days with partial hourly bookings show a "Limited" indicator
- Days fully booked (all slots, all hours) show as "Booked"
- Days with blocked time slots reflect the partial availability

### Booking Widget
- Shows accurate slot availability accounting for hourly bookings
- Time grid shows which hours are already taken
