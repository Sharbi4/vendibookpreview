
# Plan: Require Weekly Schedule for Hourly Listings + Display on Listing Detail

## Overview
When hosts enable hourly or "both" (daily + hourly) booking modes, they must set their available hours via the weekly schedule grid. This schedule will also be shown to renters on the listing detail page so they know when the space/asset is available for hourly bookings.

## What This Changes

### For Hosts (Creating/Editing Listings)
- When selecting "Hourly" or "Both" booking type, a validation will ensure at least one day has operating hours configured
- A clear warning message will appear if the schedule is empty
- Cannot proceed/publish until schedule is set

### For Renters (Viewing Listings)
- Listings with hourly availability will show a "Weekly Hours" section displaying when the space is open for hourly bookings (e.g., "Mon-Fri: 8am-6pm, Sat: 9am-3pm")

---

## Technical Implementation

### Step 1: Add Validation to RentalAvailabilityStep
**File:** `src/components/listing-wizard/RentalAvailabilityStep.tsx`

- Add a helper function to check if schedule has at least one day with hours:
```text
const hasAnyScheduledHours = (schedule) => 
  Object.values(schedule).some(day => day.length > 0)
```
- Show a warning banner when hourly is enabled but schedule is empty
- Expose a validation state that the parent PublishWizard can use

### Step 2: Update PublishWizard Validation
**File:** `src/components/listing-wizard/PublishWizard.tsx`

- Add validation check before allowing progression from the availability step
- If hourly is enabled and no schedule is set, show toast notification and prevent advancement
- Update the RentalAvailabilityStep callback to include schedule validation status

### Step 3: Fetch hourly_schedule in useHourlyAvailability Hook
**File:** `src/hooks/useHourlyAvailability.ts`

- Add `hourly_schedule` to the select query
- Parse and store the schedule in settings state
- Expose the schedule for use by UI components

### Step 4: Create WeeklyHoursDisplay Component
**New File:** `src/components/listing-detail/WeeklyHoursDisplay.tsx`

A compact component that:
- Takes the weekly schedule JSON as a prop
- Groups consecutive days with identical hours (e.g., "Mon-Fri: 8am-6pm")
- Shows "Closed" for days with no hours
- Uses a clean, scannable format with clock icons

Example output:
```text
Operating Hours
Mon - Fri    8:00 AM – 6:00 PM
Sat          9:00 AM – 3:00 PM
Sun          Closed
```

### Step 5: Display Hours on Listing Detail Page
**File:** `src/pages/ListingDetail.tsx`

- Fetch `hourly_schedule` as part of listing data
- Add the WeeklyHoursDisplay component in the left column details section
- Only show if listing has hourly_enabled = true and schedule exists

---

## Validation Flow

```text
Host selects "Hourly" or "Both"
         ↓
Schedule Grid appears
         ↓
     User attempts to proceed
         ↓
┌─────────────────────────────────┐
│ Is at least 1 day configured?   │
└─────────────────────────────────┘
    ↓ No                    ↓ Yes
Show warning          Allow proceed
"Please add hours"    Save schedule
```

---

## Files to Create/Modify

| File | Change |
|------|--------|
| `src/components/listing-wizard/RentalAvailabilityStep.tsx` | Add schedule validation logic and warning UI |
| `src/components/listing-wizard/PublishWizard.tsx` | Add validation gate before step progression |
| `src/hooks/useHourlyAvailability.ts` | Fetch and expose hourly_schedule |
| `src/components/listing-detail/WeeklyHoursDisplay.tsx` | **New** - Display formatted weekly hours |
| `src/pages/ListingDetail.tsx` | Add WeeklyHoursDisplay component for hourly listings |

---

## User Experience

### Host Experience
1. Creates rental listing, reaches availability step
2. Selects "Hourly" or "Both" booking type
3. **Must** configure at least one day's hours in the weekly grid
4. Clear feedback if schedule is empty when trying to continue

### Renter Experience
1. Views a listing with hourly bookings enabled
2. Sees "Operating Hours" card showing when the space is available
3. Can reference this when selecting time slots in the booking widget
