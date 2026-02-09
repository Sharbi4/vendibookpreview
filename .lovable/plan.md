
# Plan: Sync Hourly Schedule Data Across Listing Creation, Detail, and Booking Flow

## Overview
The current implementation has a disconnect between the hourly schedule configured during listing creation and the actual time slots shown in booking modals. When a host sets specific operating hours (e.g., Mon-Fri 8 AM - 6 PM), these hours should be reflected in:
1. The listing detail page (WeeklyHoursDisplay - already working)
2. The booking widget time slot generation
3. The vendor space booking modal
4. Mobile and desktop views consistently

## Current Issues Identified

| Component | Issue |
|-----------|-------|
| `useHourlyAvailability` hook | Fetches `operating_hours_start/end` but NOT `hourly_schedule`. Uses hardcoded 6 AM - 10 PM fallback |
| `RentalBookingWidget` | Receives `hourlyEnabled` prop but doesn't get the schedule. Relies on hook which lacks schedule data |
| `VendorSpaceBookingModal` | Same issue - uses `useHourlyAvailability` which doesn't have schedule data |
| `ListingDetail` | Passes `hourlyEnabled` and `dailyEnabled` but not the schedule |
| `StickyMobileCTA` | Same props missing - no schedule passed for mobile view |

## Implementation Plan

### Step 1: Update `useHourlyAvailability` Hook to Fetch and Use `hourly_schedule`
**File:** `src/hooks/useHourlyAvailability.ts`

Changes:
1. Add `hourly_schedule` to the select query
2. Store the schedule in settings state
3. Modify `getAvailableWindowsForDate` to use the per-day schedule instead of hardcoded defaults

```text
Current query:
.select('price_hourly, hourly_enabled, daily_enabled, min_hours, max_hours, buffer_time_mins, min_notice_hours, operating_hours_start, operating_hours_end, ...')

Updated query:
.select('price_hourly, hourly_enabled, daily_enabled, min_hours, max_hours, buffer_time_mins, min_notice_hours, hourly_schedule, ...')

New logic in getAvailableWindowsForDate:
1. Determine day of week for the date
2. Look up that day's windows in hourly_schedule
3. Use those windows instead of hardcoded 6-22
```

### Step 2: Update Settings Interface
**File:** `src/hooks/useHourlyAvailability.ts`

Add `hourlySchedule` to the settings interface:
```text
interface ListingHourlySettings {
  // ... existing fields
  hourlySchedule: WeeklySchedule | null;
}
```

### Step 3: Update Time Window Generation Logic
**File:** `src/hooks/useHourlyAvailability.ts`

Modify `getAvailableWindowsForDate` to:
1. Get the day of week from the date (mon, tue, wed, etc.)
2. Look up that day's time ranges from `hourlySchedule`
3. Use those ranges as operating hours instead of defaults
4. If schedule is empty for that day, return no windows (closed)

### Step 4: Expose Schedule via Hook for Display Consistency
**File:** `src/hooks/useHourlyAvailability.ts`

Return the `hourlySchedule` from the hook so components can display it if needed:
```text
return {
  settings,
  hourlySchedule: settings.hourlySchedule,
  // ... existing returns
}
```

### Step 5: Update Mobile CTA to Pass Schedule (Optional Enhancement)
**File:** `src/pages/ListingDetail.tsx`

The schedule is already fetched via `useListing`. Ensure it's accessible for mobile booking modals by passing it through or having the modal fetch it via `useHourlyAvailability`.

---

## Technical Details

### Updated `useHourlyAvailability` Query
```text
const { data: listingData } = await supabase
  .from('listings')
  .select(`
    price_hourly,
    hourly_enabled,
    daily_enabled,
    min_hours,
    max_hours,
    buffer_time_mins,
    min_notice_hours,
    hourly_schedule,
    price_daily,
    price_weekly,
    total_slots
  `)
  .eq('id', listingId)
  .single();
```

### Updated `getAvailableWindowsForDate` Logic
```text
const getAvailableWindowsForDate = (date: Date): TimeWindow[] => {
  if (!settings.hourlyEnabled) return [];
  
  const dateStr = format(date, 'yyyy-MM-dd');
  
  // Determine day of week
  const dayOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()];
  
  // Get schedule for this day
  const daySchedule = settings.hourlySchedule?.[dayOfWeek] || [];
  
  // If no hours configured for this day, it's closed
  if (!daySchedule || daySchedule.length === 0) {
    return [];
  }
  
  // Process each time window from the schedule
  const windows: TimeWindow[] = [];
  daySchedule.forEach(range => {
    const opStart = parseInt(range.start.split(':')[0]);
    const opEnd = parseInt(range.end.split(':')[0]);
    
    // ... existing slot availability logic using opStart/opEnd
  });
  
  return windows;
};
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useHourlyAvailability.ts` | Add `hourly_schedule` to query, update settings interface, modify `getAvailableWindowsForDate` to use per-day schedule |

---

## Expected Behavior After Implementation

### Listing Creation
1. Host selects "Hourly" or "Both" booking type
2. Host configures operating hours per day (e.g., Mon-Fri 9 AM - 5 PM)
3. Schedule is saved to `hourly_schedule` column

### Listing Detail Page
1. WeeklyHoursDisplay shows "Mon – Fri: 9 AM – 5 PM" (already working)
2. RentalBookingWidget shows time slots ONLY for 9 AM - 5 PM on Mon-Fri
3. Saturdays and Sundays show as unavailable for hourly booking

### Booking Flow
1. User clicks on a Monday → time grid shows 9 AM - 5 PM slots only
2. User clicks on a Saturday → no hourly slots available (or date disabled for hourly mode)
3. Vendor space modal reflects same schedule

### Mobile View
1. StickyMobileCTA opens booking modal
2. Modal uses same `useHourlyAvailability` hook → same schedule applies
3. Consistent experience across desktop and mobile

---

## Validation Scenarios

| Scenario | Before | After |
|----------|--------|-------|
| Mon-Fri 9-5 schedule, user selects Monday | Shows 6 AM - 10 PM slots | Shows 9 AM - 5 PM slots only |
| Schedule with Saturday closed, user selects Saturday | Shows 6 AM - 10 PM slots | Shows "Closed" or no slots |
| Multiple windows (9-12, 2-6), user views slots | Shows continuous 6-22 | Shows 9-12 and 2-6 windows |
| Empty schedule (new listing) | Shows 6-22 | Shows 6-22 (backwards compatible fallback) |
