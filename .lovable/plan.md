
# Plan: Hold Payouts Until 24 Hours After Booking Ends (Hourly-Aware) + Manual Release

## Overview
This plan ensures that host payouts and security deposit refunds are held for 24 hours after the booking **actually ends** - including the final booked hour for hourly bookings. This provides a dispute window for damage claims and deposit holds. Additionally, admins can manually trigger an early release for special requests.

---

## Current State Analysis

### How It Works Now
The `complete-ended-bookings` edge function (cron job) uses:
```text
.lt('end_date', releaseThresholdStr) // 24+ hours since end_date
```

**Problem**: For hourly bookings:
- `end_date` is the calendar date of the last booking day
- But a booking ending at **6 PM** on Jan 15 should hold until **6 PM on Jan 16**
- Currently, it releases at midnight Jan 16 (based on date only)

### Database Fields Available
| Field | Purpose |
|-------|---------|
| `end_date` | Last day of booking (date only) |
| `end_time` | End time for single-day hourly bookings (e.g., "18:00") |
| `hourly_slots` | JSONB array for multi-day hourly bookings: `[{date: "2026-01-15", slots: ["14:00", "15:00", "16:00", "17:00"]}]` |
| `is_hourly_booking` | Boolean flag |

---

## Implementation Plan

### Step 1: Add `booking_end_timestamp` Column
**Database Migration**

Add a computed/stored timestamp column that represents the actual end datetime:
- For daily bookings: `end_date` at 23:59:59
- For hourly bookings: `end_date` + last booked hour + 1 hour

```sql
ALTER TABLE booking_requests 
ADD COLUMN booking_end_timestamp TIMESTAMPTZ;

-- Backfill existing bookings
UPDATE booking_requests SET booking_end_timestamp = 
  CASE 
    WHEN is_hourly_booking = true AND end_time IS NOT NULL THEN
      (end_date::text || ' ' || end_time::text)::timestamptz
    WHEN is_hourly_booking = true AND hourly_slots IS NOT NULL THEN
      -- Extract last date and last hour from hourly_slots JSONB
      -- Requires plpgsql function
      calculate_booking_end_timestamp(end_date, hourly_slots)
    ELSE
      end_date::timestamptz + INTERVAL '23 hours 59 minutes 59 seconds'
  END;
```

### Step 2: Create Helper Function for Hourly Slots
**Database Migration**

Create a function to parse `hourly_slots` JSONB and find the latest end time:

```sql
CREATE OR REPLACE FUNCTION calculate_booking_end_timestamp(
  p_end_date DATE,
  p_hourly_slots JSONB
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  last_date TEXT;
  last_hour TEXT;
  slot_entry JSONB;
  hour_value TEXT;
BEGIN
  -- Default to end of day
  IF p_hourly_slots IS NULL OR jsonb_array_length(p_hourly_slots) = 0 THEN
    RETURN p_end_date::timestamptz + INTERVAL '23 hours 59 minutes 59 seconds';
  END IF;
  
  -- Find the last date in the array
  SELECT MAX(entry->>'date') INTO last_date
  FROM jsonb_array_elements(p_hourly_slots) AS entry;
  
  -- Find the last hour on that date
  SELECT MAX(hour_val) INTO last_hour
  FROM jsonb_array_elements(p_hourly_slots) AS entry
  CROSS JOIN LATERAL jsonb_array_elements_text(entry->'slots') AS hour_val
  WHERE entry->>'date' = last_date;
  
  IF last_hour IS NULL THEN
    RETURN p_end_date::timestamptz + INTERVAL '23 hours 59 minutes 59 seconds';
  END IF;
  
  -- Return end of the last booked hour (add 1 hour to start time)
  RETURN (last_date || ' ' || last_hour)::timestamptz + INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### Step 3: Update Booking Creation to Set `booking_end_timestamp`
**Files:** `create-booking-hold/index.ts`, `stripe-webhook/index.ts`

When a booking is created/confirmed, calculate and store `booking_end_timestamp`:

```typescript
// For hourly bookings with hourly_slots
function calculateBookingEndTimestamp(
  endDate: string, 
  endTime: string | null, 
  hourlySlots: HourlySlotData[] | null,
  isHourlyBooking: boolean
): string {
  if (!isHourlyBooking) {
    // Daily booking: end of day
    return `${endDate}T23:59:59Z`;
  }
  
  if (hourlySlots && hourlySlots.length > 0) {
    // Multi-day hourly: find last date and last hour
    const sortedSlots = [...hourlySlots].sort((a, b) => 
      a.date > b.date ? -1 : 1
    );
    const lastDay = sortedSlots[0];
    const lastHour = lastDay.slots.sort().pop(); // Get latest hour
    const hourNum = parseInt(lastHour.split(':')[0]) + 1; // Add 1 hour for end
    return `${lastDay.date}T${String(hourNum).padStart(2, '0')}:00:00Z`;
  }
  
  if (endTime) {
    // Single-day hourly with end_time
    return `${endDate}T${endTime}:00Z`;
  }
  
  return `${endDate}T23:59:59Z`;
}
```

### Step 4: Update `complete-ended-bookings` Edge Function
**File:** `supabase/functions/complete-ended-bookings/index.ts`

Change from date-based to timestamp-based checks:

**Step 1 - Mark as completed:**
```typescript
// Current: .lt('end_date', todayStr)
// New: .lt('booking_end_timestamp', now.toISOString())
```

**Step 2 - Payout eligibility:**
```typescript
// Current: .lt('end_date', releaseThresholdStr)
// New: .lt('booking_end_timestamp', twentyFourHoursAgo.toISOString())
```

**Step 3 - Deposit refund eligibility:**
```typescript
// Same change - use booking_end_timestamp instead of end_date
```

### Step 5: Add `payout_hold_until` Column for Manual Override
**Database Migration**

Add a column that admins can set to extend or shorten the hold period:

```sql
ALTER TABLE booking_requests 
ADD COLUMN payout_hold_until TIMESTAMPTZ,
ADD COLUMN payout_hold_reason TEXT,
ADD COLUMN payout_hold_set_by UUID REFERENCES profiles(id);
```

### Step 6: Create `admin-release-payout` Edge Function
**New File:** `supabase/functions/admin-release-payout/index.ts`

Admin-only function to manually release payouts early:

```typescript
// Request body: { booking_id, release_type: 'payout' | 'deposit' | 'both', reason }
// Validates admin status
// If release_type includes 'payout':
//   - Immediately triggers payout transfer
//   - Sets payout_processed = true, payout_processed_at = now
// If release_type includes 'deposit':
//   - Immediately processes deposit refund
// Logs the action with reason
```

### Step 7: Update Complete-Ended-Bookings to Respect Manual Holds
**File:** `supabase/functions/complete-ended-bookings/index.ts`

Add check for `payout_hold_until`:

```typescript
// Skip if manual hold is set and not yet expired
if (booking.payout_hold_until && new Date(booking.payout_hold_until) > now) {
  logStep("Booking has manual hold - skipping", { 
    bookingId: booking.id, 
    holdUntil: booking.payout_hold_until 
  });
  continue;
}
```

### Step 8: Create `admin-set-hold` Edge Function
**New File:** `supabase/functions/admin-set-hold/index.ts`

Admin function to extend holds (e.g., pending damage investigation):

```typescript
// Request body: { booking_id, hold_until, reason }
// Sets payout_hold_until, payout_hold_reason, payout_hold_set_by
// Sends notification to host explaining the hold
```

### Step 9: Add Admin UI for Manual Release
**File:** `src/pages/AdminDashboard.tsx` and/or new component

Add controls in the admin dashboard:
- View bookings with pending payouts
- "Release Early" button for special requests
- "Extend Hold" button for damage investigations
- Show hold status and reason

---

## Technical Flow Diagram

```text
BOOKING ENDS (hourly or daily)
         |
         v
booking_end_timestamp calculated
         |
         v
24 hours pass (or admin early release)
         |
         v
complete-ended-bookings cron runs
         |
    ┌────┴────┐
    |         |
Has dispute?  Has manual hold?
    |         |
    v         v
   Skip      Skip
    |
    v
No issues → Process payout & deposit refund
```

---

## Files to Modify/Create

| File | Change |
|------|--------|
| Database | Add `booking_end_timestamp`, `payout_hold_until`, `payout_hold_reason`, `payout_hold_set_by` columns |
| Database | Create `calculate_booking_end_timestamp()` function |
| `stripe-webhook/index.ts` | Set `booking_end_timestamp` on booking confirmation |
| `create-booking-hold/index.ts` | Set `booking_end_timestamp` on booking creation |
| `complete-ended-bookings/index.ts` | Use `booking_end_timestamp` instead of `end_date`, respect manual holds |
| `admin-release-payout/index.ts` | **New** - Manual early release function |
| `admin-set-hold/index.ts` | **New** - Extend hold function |
| `src/pages/AdminDashboard.tsx` | Add payout management UI section |

---

## Expected Behavior After Implementation

### Standard Flow
| Booking Type | End Condition | Payout Release |
|--------------|---------------|----------------|
| Daily (Jan 15-17) | Jan 17 midnight | Jan 18 midnight + 24h = Jan 19 00:00 |
| Hourly (Jan 15, 9am-5pm) | Jan 15 5pm | Jan 16 5pm |
| Multi-day hourly (Jan 15-16, various hours) | Last hour on Jan 16 (e.g., 6pm) | Jan 17 6pm |

### Manual Override Scenarios
| Scenario | Action | Result |
|----------|--------|--------|
| Host requests early release | Admin clicks "Release Early" | Immediate payout |
| Damage reported | Admin sets hold for 7 days | Payout delayed until hold expires or dispute resolved |
| Special VIP host | Admin releases same day | Immediate payout |

---

## Validation Checklist

- Hourly bookings hold for 24h after last booked hour (not midnight)
- Multi-day hourly correctly uses the latest slot across all days
- Daily bookings work as before (24h after end of last day)
- Disputes block automatic release (existing behavior preserved)
- Admin can manually release early
- Admin can extend holds for investigations
- Deposit refunds follow same logic as payouts
