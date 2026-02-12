

# Restyle City/State Confirmation + Ensure Data Persistence

## Problem
1. The city/state confirmation overlay in both the QuickStartWizard and StepLocation uses emerald/green borders and backgrounds, which conflicts with the platform's "dark-shine" design system (black borders, clean neutral greys).
2. The ZIP code input also turns green on confirmation (`border-emerald-500`), which is inconsistent.
3. The QuickStartWizard saves city/state into the `address` field as "City, ST" but the database has no dedicated `city`, `state`, or `zip_code` columns -- so the data only persists as a concatenated string. This is already correct behavior since listing cards and detail pages read from `listing.address`. However, we should verify that the full wizard (ListingWizard) also properly saves the structured fields into the `address` column.

## Changes

### 1. Restyle City/State Confirmation Overlay (StepLocation.tsx)
**Lines 154-171**: Replace emerald-themed overlay with dark-shine consistent styling:
- Background: `bg-muted/50` (clean grey) instead of `bg-emerald-50`
- Border: `border-border` (standard dark/neutral) instead of `border-emerald-200`
- Check icon: `text-foreground` instead of `text-emerald-600`
- Remove dark mode emerald variants

### 2. Restyle City/State Confirmation Overlay (QuickStartWizard.tsx)
**Lines 448-465**: Same restyling as above -- replace emerald with neutral dark-shine:
- Background: `bg-muted/50`
- Border: `border-border`
- Check icon: `text-foreground`

### 3. Restyle ZIP Code Input Confirmed State (both files)
- Replace `border-emerald-500 focus-visible:ring-emerald-500` with `border-foreground focus-visible:ring-foreground` for a clean black/dark border on confirmation instead of green.

### 4. Verify Data Flow
The existing data pipeline is:
- QuickStartWizard: ZIP lookup populates `city`, `state`, `latitude`, `longitude` in local state, then saves `address: "City, ST"` to DB.
- ListingWizard: Builds `address` from `street_address, apt_suite, city, state, zip_code` fields (form-only, not DB columns). Saves the concatenated result to `listings.address`.
- Listing cards (HostListingCard, ShopperBookingCard) and detail page read `listing.address` -- this works correctly.

No database migration is needed. The structured fields are form-level only and correctly persist as the joined `address` string.

## Technical Details

### Files Modified
- **src/components/listing-wizard/StepLocation.tsx** -- Restyle ZipCodeLookup component (confirmed input border + confirmation overlay)
- **src/components/listing-wizard/QuickStartWizard.tsx** -- Restyle ZIP confirmed state and city/state overlay

### Design Tokens Used
- `bg-muted/50` -- clean grey fill (consistent with other panels in the wizard)
- `border-border` -- standard neutral border
- `text-foreground` -- dark text/icon color for the check mark
- `border-foreground` -- dark border for confirmed ZIP input
