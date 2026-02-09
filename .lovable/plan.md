

## Fix: Hourly Rates and Operating Hours Not Displaying

### Root Cause

The hourly schedule was saved to the database with full day names (`monday`, `tuesday`, `wednesday`, etc.), but **all frontend components expect abbreviated keys** (`mon`, `tue`, `wed`, etc.). This means every component that reads `hourly_schedule` finds no matching keys and displays nothing.

### Affected Areas

1. **Listing Detail Page** - `WeeklyHoursDisplay` shows "Operating Hours" section but finds no data
2. **Listing Card** - Schedule summary (e.g., "Every day 12AM-11PM") doesn't render  
3. **Booking Widget** - `useHourlyAvailability` hook can't find operating hours for any day, so no time slots are generated
4. **PricingSection** - Already works correctly (uses `price_hourly` column directly, not the schedule)

### Fix Plan

#### Step 1: Fix the Database Data
Run a SQL update to convert the `hourly_schedule` keys from full names to abbreviated names for the affected listing:

```text
UPDATE listings 
SET hourly_schedule = '{
  "mon": [{"start":"00:00","end":"07:00","price":15},{"start":"08:00","end":"23:59","price":20}],
  "tue": [{"start":"00:00","end":"07:00","price":15},{"start":"08:00","end":"23:59","price":20}],
  "wed": [{"start":"00:00","end":"07:00","price":15},{"start":"08:00","end":"23:59","price":20}],
  "thu": [{"start":"00:00","end":"07:00","price":15},{"start":"08:00","end":"23:59","price":20}],
  "fri": [{"start":"00:00","end":"07:00","price":15},{"start":"08:00","end":"23:59","price":20}],
  "sat": [{"start":"00:00","end":"07:00","price":15},{"start":"08:00","end":"23:59","price":20}],
  "sun": [{"start":"00:00","end":"07:00","price":15},{"start":"08:00","end":"23:59","price":20}]
}'
WHERE id = 'ede54357-a79d-4325-bb1f-153c75fd89dc';
```

#### Step 2: Add Defensive Key Normalization

To prevent this from happening again (e.g., if data is set via SQL or external tools), add a normalization utility that maps full day names to abbreviated keys. Apply this in the key consumption points:

- **`WeeklyHoursDisplay.tsx`** - Add normalization when reading the schedule prop
- **`useHourlyAvailability.ts`** - Add normalization after parsing `hourly_schedule` from DB
- **`ListingCard.tsx`** - Add normalization in the schedule summary logic
- **`ListingCardPreview.tsx`** - Add normalization in `getScheduleSummary`

The normalizer will be a simple shared helper:

```text
function normalizeScheduleKeys(schedule): converts 
  "monday" -> "mon", "tuesday" -> "tue", etc.
  Already-abbreviated keys pass through unchanged.
```

#### Step 3: Ensure Hourly Rate Displays on Listing Detail Pricing

The `PricingSection` already handles `priceHourly` display. The listing detail page already passes `listing.price_hourly`. This should already work since `price_hourly = 20` is set in the DB. No code changes needed here.

### Summary of Changes

| File | Change |
|------|--------|
| Database | Fix key names in `hourly_schedule` JSONB |
| `src/lib/scheduleUtils.ts` (new) | Shared `normalizeScheduleKeys` helper |
| `src/components/listing-detail/WeeklyHoursDisplay.tsx` | Normalize schedule before processing |
| `src/hooks/useHourlyAvailability.ts` | Normalize schedule after DB fetch |
| `src/components/listing/ListingCard.tsx` | Normalize schedule for summary |
| `src/components/listing-wizard/ListingCardPreview.tsx` | Normalize schedule for preview |

### Technical Details

The normalization map:
```text
monday -> mon, tuesday -> tue, wednesday -> wed, 
thursday -> thu, friday -> fri, saturday -> sat, sunday -> sun
```

This is a backward-compatible change -- if keys are already abbreviated, they pass through unchanged. This makes the system resilient to data entered via either format.

