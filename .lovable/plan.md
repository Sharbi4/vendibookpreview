

# Listing Wizard UX Overhaul: Split-Screen Layout & Field Consolidation

## Overview

This plan addresses three core UX issues in the Listing Wizard:

1. **The "Blind" Wizard Problem** - Users can't see their listing preview until clicking a hidden button
2. **Step 3 Overload** - Pricing step contains too many unrelated sections (price, availability, deposits, payment methods, freight)
3. **Disconnected Field Grouping** - Dimensions float separately, instructions are far from their toggles

---

## Phase 1: Split-Screen Layout (Desktop)

Transform the wizard from a single-column layout to a 2-column layout on large screens.

**Current Layout (lines 952-964 of ListingWizard.tsx):**
```
container max-w-2xl → single column form
```

**New Layout:**
```
container max-w-7xl → 12-column grid
├── Left (7-8 cols): Form + Navigation
└── Right (4-5 cols): Sticky Preview + Checklist
```

### Changes to `ListingWizard.tsx`:

1. **Expand container width** from `max-w-2xl` to `max-w-7xl`
2. **Add 12-column grid layout** with responsive breakpoints
3. **Move preview to persistent right sidebar** (currently in modal only)
4. **Add sticky positioning** with `top-24` for header clearance
5. **Show live ListingCardPreview** with real-time form data
6. **Display PublishChecklist** below preview showing missing requirements
7. **Hide right column on mobile** (`hidden lg:block`)

### Mobile Behavior:
- Preview button remains for modal access
- Form stays single-column full-width
- All simplification improvements still apply

---

## Phase 2: Simplify StepPricing.tsx

Restructure the pricing step into clear visual sections with reduced cognitive load.

### Current Structure (743 lines):
- AI Pricing Assistant (large gradient card)
- Rental/Sale suggestions display
- Price inputs
- Payout estimates
- Availability dates (rental)
- Instant Book toggle (rental)
- Security Deposit (rental)
- Payment Methods (sale)
- Freight Settings (sale)

### New Structure:

**Section 1: Core Price (Hero)**
- Larger price inputs (`text-2xl` for rental, `text-3xl` for sale)
- AI button moved to inline header (subtle ghost button)
- Payout estimate immediately below

**Section 2: Financial Settings (2-column grid)**
| Left Column: Protection | Right Column: Settings |
|------------------------|----------------------|
| Security Deposit (rental) | Instant Book toggle |
| Payment Methods (sale) | Availability Window |

**Section 3: Logistics (separated)**
- Freight Settings (sale only) - keep existing card

### Key Changes:
1. **Replace large AI card** with inline ghost button in section header
2. **Increase price input prominence** with larger text and height
3. **Use `grid md:grid-cols-2`** for financial settings
4. **Add section headers** with uppercase labels ("PROTECTION", "SETTINGS")
5. **Consolidate availability dates** into compact inline format

---

## Phase 3: Consolidate Dimensions in StepDetails.tsx

Group physical specifications into a cohesive "spec sheet" style card.

### Current Structure (lines 261-372):
- Separate card with 2-column + 3-column grids
- Labels with individual icons

### New Structure:
```
┌─────────────────────────────────────────────────────┐
│ [Ruler] Physical Specifications                      │
│ Required for shipping estimates                      │
├─────────────────────────────────────────────────────┤
│  LENGTH      WIDTH       HEIGHT       WEIGHT        │
│  [    ] in  [    ] in   [    ] in    [    ] lbs    │
├─────────────────────────────────────────────────────┤
│  Freight Type: [Dropdown]                           │
└─────────────────────────────────────────────────────┘
```

### Key Changes:
1. **Single 4-column grid** for all dimensions
2. **Unit labels inside inputs** (absolute positioned right)
3. **Uppercase mini-labels** for cleaner hierarchy
4. **Consolidated header** with icon and description
5. **Background styling** with `bg-muted/30 border-border`

---

## Phase 4: Context-Pair Instructions in StepLocation.tsx

Move instruction textareas inside their parent selection cards for better context.

### Current Flow:
1. Select fulfillment type
2. Show location input
3. Show instructions separately below

### New Flow:
1. Select fulfillment type
2. Expand selected option to reveal:
   - Location input (inside card)
   - Instructions textarea (inside card)

This pairs context directly with the relevant fields.

---

## Technical Implementation

### Files to Modify:

| File | Changes |
|------|---------|
| `src/components/listing-wizard/ListingWizard.tsx` | Split-screen layout, persistent preview sidebar |
| `src/components/listing-wizard/StepPricing.tsx` | Restructure into 3 sections, inline AI button, 2-col grid |
| `src/components/listing-wizard/StepDetails.tsx` | 4-column dimensions grid |
| `src/components/listing-wizard/StepLocation.tsx` | Inline instructions in selection cards |
| `src/components/listing-wizard/ListingCardPreview.tsx` | Accept formData props directly for preview |

---

## Detailed Code Changes

### 1. ListingWizard.tsx (lines 952-1030)

**Replace content container with split-screen layout:**

- Change `max-w-2xl` to `max-w-7xl`
- Add `grid grid-cols-1 lg:grid-cols-12 gap-8`
- Left column: `lg:col-span-7 xl:col-span-8` with form and navigation
- Right column: `hidden lg:block lg:col-span-5 xl:col-span-4` with sticky preview
- Add `Eye` icon header for preview section
- Include `ListingCardPreview` with mapped formData
- Show `PublishChecklist` below preview

### 2. StepPricing.tsx

**Section 1 - Core Price:**
- Header with inline AI button: `flex justify-between`
- Price inputs with `text-2xl font-bold h-14` (rental) or `text-3xl font-bold h-16` (sale)
- Payout estimate card immediately after

**Section 2 - Financial Settings:**
- Divider: `<div className="h-px bg-border" />`
- Grid: `grid md:grid-cols-2 gap-6`
- Column headers: `text-sm font-medium text-muted-foreground uppercase tracking-wider`
- Cards with consistent styling: `p-4 rounded-xl border border-border bg-card`

**Section 3 - Logistics:**
- Keep existing freight card for sales
- Remove from rental flow (not applicable)

### 3. StepDetails.tsx (lines 261-372)

**Replace current dimensions layout with:**
```tsx
<div className="bg-muted/30 border border-border rounded-xl p-5 space-y-4">
  <div className="flex items-center gap-2">
    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
      <Ruler className="h-4 w-4" />
    </div>
    <div>
      <Label className="text-base font-semibold">Physical Specifications</Label>
      <p className="text-xs text-muted-foreground">Required for shipping estimates</p>
    </div>
  </div>
  
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {/* Length, Width, Height, Weight with inline unit labels */}
  </div>
  
  {/* Freight Type dropdown */}
</div>
```

### 4. StepLocation.tsx

**Restructure fulfillment options to include inline fields:**
- When "Pickup" is selected, expand to show location + instructions inside the card
- When "Delivery" is selected, expand to show base location + delivery options inside
- Use `animate-in fade-in-50` for smooth expansion

---

## Visual Hierarchy Improvements

| Element | Before | After |
|---------|--------|-------|
| Daily price input | `text-lg` | `text-2xl font-bold h-14` |
| Sale price input | `text-xl` | `text-3xl font-bold h-16` |
| AI button | Large gradient card (50+ lines) | Inline ghost button (1 line) |
| Section headers | Mixed styles | Consistent uppercase labels |
| Dimensions | 2x3 floating grids | 1x4 row in spec card |
| Preview | Hidden modal | Always-visible sticky sidebar |

---

## Benefits Summary

| Improvement | User Impact |
|-------------|-------------|
| Split-screen preview | Instant visual feedback while editing |
| Simplified pricing | Reduced cognitive load, faster completion |
| Grouped dimensions | Clear "spec sheet" mental model |
| Inline instructions | Context preserved, less scrolling |
| Publish checklist | Clear progress, no surprises |

---

## Mobile Considerations

All changes maintain mobile compatibility:
- Split-screen hidden on `< lg` breakpoints
- Preview button remains for modal access
- Simplified sections still apply to single-column
- Touch-friendly input sizes maintained

