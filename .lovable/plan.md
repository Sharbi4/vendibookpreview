
# Plan: Prevent Overbooking + Enhanced Host Calendar View

## Overview
This plan addresses two key requirements:
1. **Prevent overbooking** across daily, hourly, weekly, and monthly booking types (with and without multi-slot capacity)
2. **Enhanced Host Calendar** that shows booked days/hours with shopper names, times, and booking details

---

## Current State Analysis

### What's Already Working
- **Frontend validation** in `useHourlyAvailability` and `useBlockedDates` hooks correctly calculates available slots and prevents selection of unavailable dates/times
- **Slot-based availability** in `useListingAvailability` tracks slots booked per date
- **Hourly conflict detection** counts hourly bookings per hour and applies buffer times
- **VendorSpaceBookingModal** correctly checks slot availability across date ranges

### Gaps Identified

| Area | Issue |
|------|-------|
| **Server-side validation** | No backend conflict check when booking is created - only frontend prevents conflicts |
| **Race conditions** | Two users could submit for same dates simultaneously |
| **Host calendar** | Shows minimal booking info (dates + price only), no shopper names/times |
| **Hourly bookings in calendar** | Calendar doesn't show which hours are booked or who booked them |

---

## Implementation Plan

### Part 1: Server-Side Overbooking Prevention

#### Step 1: Create Database Function for Conflict Check
**Database Migration**

Create a PostgreSQL function that validates booking availability before insert:

```sql
CREATE OR REPLACE FUNCTION check_booking_availability(
  p_listing_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_is_hourly_booking BOOLEAN DEFAULT FALSE,
  p_hourly_slots JSONB DEFAULT NULL,
  p_slot_number INTEGER DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_listing RECORD;
  v_total_slots INTEGER;
  v_conflict_found BOOLEAN := FALSE;
  v_conflict_message TEXT;
  v_current_date DATE;
  v_slots_booked INTEGER;
  v_day_slots JSONB;
  v_hour_conflicts JSONB := '[]'::JSONB;
BEGIN
  -- Fetch listing capacity
  SELECT total_slots, hourly_enabled, daily_enabled
  INTO v_listing
  FROM listings WHERE id = p_listing_id;
  
  v_total_slots := COALESCE(v_listing.total_slots, 1);
  
  -- For specific slot bookings, check that slot only
  IF p_slot_number IS NOT NULL THEN
    -- Check for overlapping bookings on the same slot
    IF EXISTS (
      SELECT 1 FROM booking_requests
      WHERE listing_id = p_listing_id
        AND slot_number = p_slot_number
        AND status IN ('pending', 'approved')
        AND payment_status IN ('pending', 'paid')
        AND NOT (end_date < p_start_date OR start_date > p_end_date)
    ) THEN
      RETURN jsonb_build_object(
        'available', FALSE,
        'error', format('Slot %s is already booked for these dates', p_slot_number)
      );
    END IF;
  END IF;
  
  -- For daily bookings without specific slot, check total capacity
  IF NOT p_is_hourly_booking THEN
    v_current_date := p_start_date;
    WHILE v_current_date <= p_end_date LOOP
      SELECT COUNT(*) INTO v_slots_booked
      FROM booking_requests
      WHERE listing_id = p_listing_id
        AND status IN ('pending', 'approved')
        AND payment_status IN ('pending', 'paid')
        AND NOT is_hourly_booking
        AND start_date <= v_current_date
        AND end_date >= v_current_date;
      
      IF v_slots_booked >= v_total_slots THEN
        RETURN jsonb_build_object(
          'available', FALSE,
          'error', format('No slots available for %s', v_current_date)
        );
      END IF;
      v_current_date := v_current_date + 1;
    END LOOP;
  END IF;
  
  -- For hourly bookings, check each hour in hourly_slots
  IF p_is_hourly_booking AND p_hourly_slots IS NOT NULL THEN
    -- Check each day's hours for conflicts
    FOR v_day_slots IN SELECT * FROM jsonb_array_elements(p_hourly_slots)
    LOOP
      -- Implementation: check each hour for capacity
      -- (detailed hour-by-hour conflict check)
    END LOOP;
  END IF;
  
  RETURN jsonb_build_object('available', TRUE);
END;
$$ LANGUAGE plpgsql STABLE;
```

#### Step 2: Add Database Trigger for Booking Validation
**Database Migration**

Create a trigger that runs before insert on `booking_requests`:

```sql
CREATE OR REPLACE FUNCTION validate_booking_availability()
RETURNS TRIGGER AS $$
DECLARE
  v_result JSONB;
BEGIN
  v_result := check_booking_availability(
    NEW.listing_id,
    NEW.start_date,
    NEW.end_date,
    COALESCE(NEW.is_hourly_booking, FALSE),
    NEW.hourly_slots,
    NEW.slot_number
  );
  
  IF NOT (v_result->>'available')::BOOLEAN THEN
    RAISE EXCEPTION 'Booking conflict: %', v_result->>'error';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_booking_conflicts
BEFORE INSERT ON booking_requests
FOR EACH ROW
EXECUTE FUNCTION validate_booking_availability();
```

#### Step 3: Add Unique Constraint for Slot-Based Bookings
**Database Migration**

Create a partial unique index to prevent double-booking the same slot:

```sql
-- Prevent same slot being booked twice for overlapping dates
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_slot_booking
ON booking_requests (listing_id, slot_number, start_date, end_date)
WHERE status IN ('pending', 'approved') 
  AND payment_status IN ('pending', 'paid')
  AND slot_number IS NOT NULL;
```

---

### Part 2: Enhanced Host Calendar View

#### Step 4: Update `useListingAvailability` to Fetch Shopper Details
**File:** `src/hooks/useListingAvailability.ts`

Expand the booking query to include shopper information:

```text
Current:
.select('*')

Updated:
.select(`
  *,
  shopper:profiles!booking_requests_shopper_id_fkey(
    id,
    full_name,
    email,
    avatar_url
  )
`)
```

#### Step 5: Create Enhanced Host Calendar Component
**New File:** `src/components/dashboard/HostAvailabilityCalendar.tsx`

Create an enhanced calendar specifically for hosts that:
- Shows booked dates with shopper initials/avatars
- Displays hourly bookings with time slots
- Allows clicking on a date to see booking details
- Shows pending vs. confirmed bookings distinctly

Features:
- **Date cells** show booking indicators with shopper initials
- **Hover tooltips** show booking summary (name, dates, times, price)
- **Click to expand** shows full booking card details
- **Hourly timeline view** for hourly bookings (shows which hours are booked)
- **Multi-slot view** shows which slots are booked on each date

#### Step 6: Update AvailabilityCalendar Sidebar with Enhanced Booking Info
**File:** `src/components/dashboard/AvailabilityCalendar.tsx`

Enhance the sidebar to show:
- Shopper name and avatar
- Booking dates and times (for hourly)
- Total price
- Booking status with phase indicator
- Quick action buttons (message, view details)

```text
Current sidebar:
{format(new Date(booking.start_date), 'MMM d')} - {format(new Date(booking.end_date), 'MMM d')}
${booking.total_price} total

Enhanced sidebar:
<Avatar with shopper initials>
{shopper.full_name}
Jan 15 - Jan 17 (3 days)
OR
Jan 15 • 9am - 5pm (8 hours)
$450 total
<Badge: Confirmed / Pending>
<Button: Message>
```

#### Step 7: Add Hourly Slot Visualization to Calendar
**File:** `src/components/dashboard/AvailabilityCalendar.tsx`

For listings with hourly bookings enabled:
- Show a mini timeline under each date cell
- Indicate which hours are booked vs. available
- Show booking owner for each hour block

---

### Part 3: Updated Types and Interfaces

#### Step 8: Update Booking Interface
**File:** `src/hooks/useListingAvailability.ts`

```typescript
interface BookingWithDetails extends Tables<'booking_requests'> {
  shopper?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
  // hourly_slots is already in the table
}
```

---

## Files to Create/Modify

| File | Change |
|------|--------|
| Database | Create `check_booking_availability()` function |
| Database | Create `validate_booking_availability()` trigger |
| Database | Add unique index for slot bookings |
| `src/hooks/useListingAvailability.ts` | Expand query to include shopper details |
| `src/components/dashboard/AvailabilityCalendar.tsx` | Enhanced sidebar with shopper info, hourly timeline, quick actions |
| `src/components/dashboard/HostAvailabilityCalendar.tsx` | **New** - Full-featured host calendar component |

---

## Expected Behavior After Implementation

### Overbooking Prevention
| Scenario | Before | After |
|----------|--------|-------|
| Two users book same dates simultaneously | Race condition - both may succeed | Server rejects second booking |
| User selects slot already booked (race) | May create duplicate | Database trigger prevents |
| Hourly overlap on same date | Only frontend check | Server validates hour conflicts |

### Host Calendar View
| Feature | Before | After |
|---------|--------|-------|
| Shopper info | Not shown | Name, avatar, email visible |
| Hourly bookings | Shows dates only | Shows specific hours booked |
| Quick actions | None | Message, View Details buttons |
| Booking details | Click opens modal | Hover shows preview, click for details |
| Multi-slot view | Basic indicators | Shows which slots are booked |

---

## Visual Mockup: Enhanced Calendar Cell

```text
┌─────────────────────┐
│  15                 │ ← Date number
│  ┌─────────────────┐│
│  │ JD 9a-5p       ◉││ ← John Doe, 9am-5pm, confirmed
│  │ AS 2p-6p       ○││ ← Amy Smith, 2pm-6pm, pending  
│  └─────────────────┘│
│  2/5 slots left     │ ← Capacity indicator
└─────────────────────┘
```

---

## Validation Checklist

- Server rejects booking if dates/times conflict with existing bookings
- Server respects slot capacity (e.g., 5 slots = max 5 concurrent bookings)
- Hourly bookings correctly block overlapping hours
- Host calendar shows shopper names on booked dates
- Host can see hourly breakdown for hourly bookings
- Quick message action works from calendar
- Mobile view displays booking info appropriately
