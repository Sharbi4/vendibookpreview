

# Add Subcategories to Listing Creation Wizard

## Overview

Add a **subcategory** field to listing creation that allows hosts to specify a more detailed type within each main category. This enables better filtering and helps renters/buyers find exactly what they need.

---

## Proposed Subcategories (5 per category)

| Main Category | Subcategories |
|---------------|---------------|
| **Food Truck** | Full-Service Kitchen, Coffee & Beverage, BBQ & Smoker, Pizza Truck, Ice Cream & Dessert |
| **Food Trailer** | Concession Trailer, Catering Trailer, BBQ Pit Trailer, Mobile Bar, Specialty Food Trailer |
| **Ghost Kitchen** | Commercial Kitchen, Cottage Kitchen, Bakery Kitchen, Prep Kitchen, Shared Commissary |
| **Vendor Lot** | Festival Ground, Farmers Market Spot, Brewery/Bar Patio, Private Event Space, Street Corner Spot |

---

## Implementation Plan

### Phase 1: Database Migration

Add a new `subcategory` column to the `listings` table:

```sql
ALTER TABLE listings 
ADD COLUMN subcategory text;

-- Add index for filtering performance
CREATE INDEX idx_listings_subcategory ON listings(subcategory);
```

The column is nullable so existing listings don't break, and new listings can optionally specify a subcategory.

---

### Phase 2: Type Definitions

**File: `src/types/listing.ts`**

Add new type and constants:

```typescript
// Subcategory type - string union for each main category
export type FoodTruckSubcategory = 
  | 'full_service_kitchen' 
  | 'coffee_beverage' 
  | 'bbq_smoker' 
  | 'pizza_truck' 
  | 'ice_cream_dessert';

export type FoodTrailerSubcategory = 
  | 'concession_trailer' 
  | 'catering_trailer' 
  | 'bbq_pit_trailer' 
  | 'mobile_bar' 
  | 'specialty_food';

export type GhostKitchenSubcategory = 
  | 'commercial_kitchen' 
  | 'cottage_kitchen' 
  | 'bakery_kitchen' 
  | 'prep_kitchen' 
  | 'shared_commissary';

export type VendorLotSubcategory = 
  | 'festival_ground' 
  | 'farmers_market' 
  | 'brewery_patio' 
  | 'private_event' 
  | 'street_corner';

export type ListingSubcategory = 
  | FoodTruckSubcategory 
  | FoodTrailerSubcategory 
  | GhostKitchenSubcategory 
  | VendorLotSubcategory;

// Subcategory options mapped by parent category
export const SUBCATEGORIES_BY_CATEGORY: Record<ListingCategory, { 
  value: string; 
  label: string; 
  description: string 
}[]> = {
  food_truck: [
    { value: 'full_service_kitchen', label: 'Full-Service Kitchen', description: 'Complete cooking setup for any cuisine' },
    { value: 'coffee_beverage', label: 'Coffee & Beverage', description: 'Espresso, smoothies, and specialty drinks' },
    { value: 'bbq_smoker', label: 'BBQ & Smoker', description: 'Built-in smoker and grill setup' },
    { value: 'pizza_truck', label: 'Pizza Truck', description: 'Wood-fired or deck oven for pizza' },
    { value: 'ice_cream_dessert', label: 'Ice Cream & Dessert', description: 'Freezers and soft-serve equipment' },
  ],
  food_trailer: [
    { value: 'concession_trailer', label: 'Concession Trailer', description: 'Classic fair-style food service' },
    { value: 'catering_trailer', label: 'Catering Trailer', description: 'High-volume event catering setup' },
    { value: 'bbq_pit_trailer', label: 'BBQ Pit Trailer', description: 'Dedicated smoker and BBQ pit' },
    { value: 'mobile_bar', label: 'Mobile Bar', description: 'Beverage service with bar setup' },
    { value: 'specialty_food', label: 'Specialty Food Trailer', description: 'Unique cuisine or concept builds' },
  ],
  ghost_kitchen: [
    { value: 'commercial_kitchen', label: 'Commercial Kitchen', description: 'Full commercial-grade facility' },
    { value: 'cottage_kitchen', label: 'Cottage Kitchen', description: 'Licensed home kitchen for cottage food' },
    { value: 'bakery_kitchen', label: 'Bakery Kitchen', description: 'Ovens, mixers, and pastry equipment' },
    { value: 'prep_kitchen', label: 'Prep Kitchen', description: 'Prep-only space for off-site cooking' },
    { value: 'shared_commissary', label: 'Shared Commissary', description: 'Multi-vendor shared kitchen space' },
  ],
  vendor_lot: [
    { value: 'festival_ground', label: 'Festival Ground', description: 'High-traffic event and festival spots' },
    { value: 'farmers_market', label: 'Farmers Market Spot', description: 'Weekly market vendor locations' },
    { value: 'brewery_patio', label: 'Brewery/Bar Patio', description: 'Partnered taproom or bar location' },
    { value: 'private_event', label: 'Private Event Space', description: 'Bookable for private functions' },
    { value: 'street_corner', label: 'Street Corner Spot', description: 'Permitted street vending locations' },
  ],
};

// Labels for display
export const SUBCATEGORY_LABELS: Record<string, string> = {
  // Food Truck
  full_service_kitchen: 'Full-Service Kitchen',
  coffee_beverage: 'Coffee & Beverage',
  bbq_smoker: 'BBQ & Smoker',
  pizza_truck: 'Pizza Truck',
  ice_cream_dessert: 'Ice Cream & Dessert',
  // Food Trailer
  concession_trailer: 'Concession Trailer',
  catering_trailer: 'Catering Trailer',
  bbq_pit_trailer: 'BBQ Pit Trailer',
  mobile_bar: 'Mobile Bar',
  specialty_food: 'Specialty Food Trailer',
  // Ghost Kitchen
  commercial_kitchen: 'Commercial Kitchen',
  cottage_kitchen: 'Cottage Kitchen',
  bakery_kitchen: 'Bakery Kitchen',
  prep_kitchen: 'Prep Kitchen',
  shared_commissary: 'Shared Commissary',
  // Vendor Lot
  festival_ground: 'Festival Ground',
  farmers_market: 'Farmers Market Spot',
  brewery_patio: 'Brewery/Bar Patio',
  private_event: 'Private Event Space',
  street_corner: 'Street Corner Spot',
};
```

**Update `ListingFormData` interface:**

```typescript
export interface ListingFormData {
  mode: ListingMode | null;
  category: ListingCategory | null;
  subcategory: string | null;  // NEW FIELD
  // ... rest of fields
}
```

**Update `Listing` interface:**

```typescript
export interface Listing {
  // ... existing fields
  subcategory?: string | null;  // NEW FIELD
}
```

---

### Phase 3: Form Hook Updates

**File: `src/hooks/useListingForm.ts`**

Add `subcategory: null` to `initialFormData` and clear subcategory when category changes:

```typescript
const initialFormData: ListingFormData = {
  mode: null,
  category: null,
  subcategory: null,  // NEW
  // ... rest
};

// In updateCategory callback - reset subcategory when category changes
const updateCategory = useCallback((category: ListingCategory) => {
  setFormData(prev => {
    const newData = { 
      ...prev, 
      category,
      subcategory: null,  // Reset subcategory when parent category changes
    };
    // ... existing logic
    return newData;
  });
}, []);
```

---

### Phase 4: UI Component Updates

**File: `src/components/listing-wizard/StepListingType.tsx`**

Add subcategory selection that appears after selecting a main category:

```text
Current Flow:
1. Select Mode (Rent / Sale)
2. Select Category (Food Truck / Food Trailer / Ghost Kitchen / Vendor Lot)

New Flow:
1. Select Mode (Rent / Sale)
2. Select Category (Food Truck / Food Trailer / Ghost Kitchen / Vendor Lot)
3. Select Subcategory (5 options based on selected category) ← NEW
```

**UI Design for Subcategory Selection:**

- Appears conditionally only after a category is selected
- Uses pill/chip style buttons (smaller than category cards)
- Horizontal scrollable on mobile, grid on desktop
- Optional field (can proceed without selecting)

```tsx
{/* Subcategory Selection - appears after category is selected */}
{formData.category && (
  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
    <div className="flex items-center gap-2">
      <Label className="text-lg font-semibold">What type of {CATEGORY_LABELS[formData.category]}?</Label>
      <span className="text-sm text-muted-foreground">(Optional)</span>
    </div>
    
    <div className="flex flex-wrap gap-3">
      {SUBCATEGORIES_BY_CATEGORY[formData.category].map((sub) => (
        <button
          key={sub.value}
          type="button"
          onClick={() => updateField('subcategory', 
            formData.subcategory === sub.value ? null : sub.value
          )}
          className={cn(
            "px-4 py-2.5 rounded-full border text-sm font-medium transition-all",
            formData.subcategory === sub.value
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card border-border hover:border-primary/50 hover:bg-muted/50"
          )}
        >
          {sub.label}
        </button>
      ))}
    </div>
    
    {/* Show description of selected subcategory */}
    {formData.subcategory && (
      <p className="text-sm text-muted-foreground pl-1">
        {SUBCATEGORIES_BY_CATEGORY[formData.category].find(
          s => s.value === formData.subcategory
        )?.description}
      </p>
    )}
  </div>
)}
```

---

### Phase 5: Wizard Integration

**File: `src/components/listing-wizard/ListingWizard.tsx`**

Update the listing save logic to include `subcategory`:

```typescript
// In the saveListing function, add subcategory to the listing data
const listingData = {
  // ... existing fields
  subcategory: formData.subcategory,
};
```

---

## Files to Create/Modify

| File | Action | Changes |
|------|--------|---------|
| Database | Migration | Add `subcategory` text column + index |
| `src/types/listing.ts` | Modify | Add subcategory types, constants, update interfaces |
| `src/hooks/useListingForm.ts` | Modify | Add `subcategory` to initial state, reset on category change |
| `src/components/listing-wizard/StepListingType.tsx` | Modify | Add subcategory pill selector UI |
| `src/components/listing-wizard/ListingWizard.tsx` | Modify | Include subcategory in save payload |
| `src/integrations/supabase/types.ts` | Auto-updated | Will reflect new column after migration |

---

## Validation Rules

- **Subcategory is optional** - hosts can leave it blank
- **Must match parent category** - if food_truck is selected, only food truck subcategories are valid
- **Cleared on category change** - prevents invalid combinations

---

## Future Filtering Support

This enables future filtering on browse/search pages:

```typescript
// Example filter query
const { data } = await supabase
  .from('listings')
  .select('*')
  .eq('category', 'ghost_kitchen')
  .eq('subcategory', 'bakery_kitchen')  // Filter by specific type
  .eq('status', 'published');
```

---

## Visual Preview

```text
Step 1: Listing Type

┌─────────────────────────────────────────────────────────────┐
│ What do you want to do?                                     │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ 🏷️ For Rent      │  │ 🛍️ For Sale      │                │
│  │ Rent out your... │  │ Sell your asset  │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                             │
│ What are you listing?                                       │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ 🚚 Food Truck   ✓│  │ 🚚 Food Trailer  │                │
│  └──────────────────┘  └──────────────────┘                │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ 🏢 Ghost Kitchen │  │ 📍 Vendor Lot    │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                             │
│ What type of Food Truck? (Optional)          ← NEW SECTION │
│                                                             │
│  ┌────────────────┐ ┌────────────────┐ ┌──────────────┐   │
│  │ Full-Service  ✓│ │ Coffee & Bev   │ │ BBQ & Smoker │   │
│  └────────────────┘ └────────────────┘ └──────────────┘   │
│  ┌─────────────┐ ┌──────────────────────┐                  │
│  │ Pizza Truck │ │ Ice Cream & Dessert  │                  │
│  └─────────────┘ └──────────────────────┘                  │
│                                                             │
│  "Complete cooking setup for any cuisine"   ← Description  │
└─────────────────────────────────────────────────────────────┘
```

