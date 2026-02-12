

# Add Slot Names and Operating Hours Enforcement to Listing Wizard

## Overview
The listing wizard currently collects the number of slots (total_slots) but never asks hosts to **name** each slot. The database already supports `slot_names` (string array) and booking uses `slot_name` per reservation, but the wizard doesn't populate this data. Additionally, when a host configures multiple slots, they should be required to set operating hours before proceeding.

## What Changes

### 1. Slot Naming UI (StepDetails.tsx)
When a host sets `total_slots` > 1 (for categories like ghost_kitchen, vendor_space, vendor_lot), a dynamic list of text inputs appears -- one per slot -- so they can name each one (e.g., "Prep Station A", "Bay 2", "Corner Spot").

- Inputs auto-generate with placeholder names ("Slot 1", "Slot 2", etc.)
- Hosts can customize each name
- Names are stored in `formData.slot_names` as a string array

### 2. Form Data Update (useListingForm.ts + types/listing.ts)
- Add `slot_names: string[]` to `ListingFormData` with default `[]`
- When `total_slots` changes, auto-resize the `slot_names` array (add new entries with defaults, trim excess)

### 3. Operating Hours Requirement
When `total_slots` is selected (slots > 0 for rental listings), the Details step will show an informational note: "You will need to configure operating hours in the Availability step before publishing." The actual enforcement already exists in the PublishWizard's `RentalAvailabilityStep` -- this adds a visual reminder earlier in the flow.

### 4. Persist Slot Names on Save (ListingWizard.tsx)
- Include `slot_names` in the insert/update payload sent to the database when saving the draft or publishing
- The `listings` table already has a `slot_names` column (string array), so no database migration is needed

### 5. PublishWizard Sync (PublishWizard.tsx)
- Load `slot_names` from the database when editing an existing listing
- Display slot name inputs in the PublishWizard's "Spaces Available" section alongside the existing `totalSlots` input
- Save `slot_names` back during publish

## Technical Details

### Files Modified
- **src/types/listing.ts** -- Add `slot_names: string[]` to `ListingFormData`
- **src/hooks/useListingForm.ts** -- Add `slot_names: []` to initial data
- **src/components/listing-wizard/StepDetails.tsx** -- Add slot name inputs below the total_slots field; auto-resize array when count changes
- **src/components/listing-wizard/StepListingType.tsx** -- Add slot name inputs for vendor_space/vendor_lot category below the total_slots input
- **src/components/listing-wizard/ListingWizard.tsx** -- Include `slot_names` in the database save payload
- **src/components/listing-wizard/PublishWizard.tsx** -- Load and save `slot_names`; add name inputs next to the existing spaces count

### No Database Migration Needed
The `listings` table already has `slot_names: string[] | null` and the `booking_requests` table already has `slot_name` and `slot_number`. This is purely a frontend wiring task.
