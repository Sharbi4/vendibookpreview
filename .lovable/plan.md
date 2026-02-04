

# Unified Supply Dashboard: Contextual Tabs Pattern

## Overview

This plan implements a "Unified Supply Dashboard" that adapts to the user's inventory type, following the Amazon/Airbnb marketplace standard. Instead of creating separate Host and Seller dashboards, we intelligently show/hide tabs and metrics based on what the user actually owns.

**The Core Insight**: A user with a food truck might try to sell it, then decide to rent it out instead. Separate dashboards create friction. A unified dashboard with smart tabs keeps their identity consistent while reducing noise.

---

## User Type Detection

We'll analyze the user's listings to determine their type:

```text
┌────────────────────────────────────────────────────────────┐
│ User Type Detection                                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  SELLER: All listings have mode === 'sale'                 │
│  • Default to "Offers" tab                                 │
│  • Hide "Requests" (booking requests) tab                  │
│  • Show HandCoins icon for Offers metric                   │
│  • Header: "Seller Console"                                │
│                                                            │
│  HOST: All listings have mode === 'rent'                   │
│  • Default to "Requests" tab (booking requests)            │
│  • Hide "Offers" tab (unless they have pending offers)     │
│  • Show Calendar icon for Requests metric                  │
│  • Header: "Host Dashboard"                                │
│                                                            │
│  HYBRID: Mix of 'rent' and 'sale' listings                 │
│  • Show all tabs                                           │
│  • Show both metrics                                       │
│  • Header: "Vendor Dashboard"                              │
│                                                            │
│  NEW USER: No listings yet                                 │
│  • Defaults to HOST behavior                               │
│  • Header: "Host Dashboard"                                │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### Phase 1: Add userType Detection

Add a `useMemo` hook to calculate the user's type based on their listings:

```tsx
const userType = useMemo(() => {
  const hasRentals = listings.some(l => l.mode === 'rent');
  const hasSales = listings.some(l => l.mode === 'sale');
  if (hasRentals && hasSales) return 'hybrid';
  if (hasSales) return 'seller';
  return 'host'; // Default for empty or rental-only
}, [listings]);
```

---

### Phase 2: Dynamic Header

Replace static header with context-aware branding:

| User Type | Icon | Title |
|-----------|------|-------|
| `seller` | Tag | "Seller Console" |
| `host` | Truck | "Host Dashboard" |
| `hybrid` | Truck | "Vendor Dashboard" |

Includes a "New Listing" / "Sell Item" button that adapts text to context.

---

### Phase 3: Adaptive Metrics Row

Current implementation (lines 74-100) shows all 4 metrics regardless of user type. 

**New behavior**:

| Metric | Show When |
|--------|-----------|
| Listings | Always |
| Views | Always |
| Requests (Calendar icon) | `userType !== 'seller'` |
| Offers (HandCoins icon) | `userType !== 'host'` |
| Revenue | Always |

For **hybrid** users, we show 5 metrics in a scrollable row or switch to a 5-column grid on desktop.

---

### Phase 4: Smart Tabs

Current TabsList (lines 109-135) shows 5 static tabs: Listings, Offers, Requests, Analytics, Revenue.

**New logic**:

| Tab | Visibility |
|-----|------------|
| Listings | Always visible |
| Offers | Hidden if `userType === 'host'` AND `pendingOffers.length === 0` |
| Requests | Hidden if `userType === 'seller'` |
| Analytics | Always visible |
| Revenue | Always visible |

**Default tab selection**:
- `seller` → defaults to "Listings" (no auto-switch needed since Offers is second)
- `host` → defaults to "Listings"
- `hybrid` → defaults to "Listings"

If a seller accidentally lands on "Requests" tab, we auto-redirect them to "Offers".

---

### Phase 5: Conditional Sales Section

Current implementation (line 276) always shows `<SellerSalesSection />`.

**New behavior**: Only render if `userType !== 'host'` (seller or hybrid).

---

### Phase 6: Controlled Tabs with Auto-Redirect

Switch from uncontrolled `<Tabs defaultValue="listings">` to controlled `<Tabs value={activeTab} onValueChange={setActiveTab}>`:

```tsx
const [activeTab, setActiveTab] = useState('listings');

useEffect(() => {
  // If pure seller lands on "bookings" tab, redirect to "offers"
  if (!isLoading && userType === 'seller' && activeTab === 'bookings') {
    setActiveTab('offers');
  }
}, [isLoading, userType, activeTab]);
```

---

## Visual Changes Summary

### For Pure Sellers (mode === 'sale' only):

**Before**: Sees confusing "Requests" tab with 0 items
**After**: 
- Header shows "Seller Console" with Tag icon
- Only sees: Listings | Offers | Analytics | Revenue
- Metrics show: Listings, Views, Offers, Revenue (no "Requests")
- SellerSalesSection shows at bottom

### For Pure Hosts (mode === 'rent' only):

**Before**: Sees "Offers" tab they'll never use
**After**:
- Header shows "Host Dashboard" with Truck icon
- Only sees: Listings | Requests | Analytics | Revenue
- Metrics show: Listings, Views, Requests, Revenue (no "Offers")
- GetBookedFasterCard shows (rental optimization tips)
- SellerSalesSection hidden

### For Hybrid Users:

**Before**: Same as everyone else, but this is correct
**After**:
- Header shows "Vendor Dashboard" with Truck icon
- Sees all tabs: Listings | Offers | Requests | Analytics | Revenue
- Metrics show all 5 in responsive grid
- Both sections visible

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/HostDashboard.tsx` | Add userType detection, controlled tabs, conditional rendering |

---

## Detailed Code Structure

### New Imports (line 2)
```tsx
import { useMemo, useState, useEffect } from 'react';
import { HandCoins } from 'lucide-react';
```

### userType Calculation (after line 33)
```tsx
const userType = useMemo(() => {
  const hasRentals = listings.some(l => l.mode === 'rent');
  const hasSales = listings.some(l => l.mode === 'sale');
  if (hasRentals && hasSales) return 'hybrid';
  if (hasSales) return 'seller';
  return 'host';
}, [listings]);

const [activeTab, setActiveTab] = useState('listings');

useEffect(() => {
  if (!isLoading && userType === 'seller' && activeTab === 'bookings') {
    setActiveTab('offers');
  }
}, [isLoading, userType, activeTab]);
```

### Dynamic Header (new section at ~line 54)
```tsx
<div className="flex items-center justify-between">
  <div className="flex items-center gap-2">
    {userType === 'seller' ? <Tag className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
    <h1 className="text-xl font-semibold">
      {userType === 'seller' ? 'Seller Console' : 
       userType === 'hybrid' ? 'Vendor Dashboard' : 'Host Dashboard'}
    </h1>
  </div>
  <Button variant="dark-shine" size="sm" asChild>
    <Link to="/list">
      <Plus className="h-3.5 w-3.5 mr-1.5" />
      {userType === 'seller' ? 'Sell Item' : 'New Listing'}
    </Link>
  </Button>
</div>
```

### Conditional Metrics (lines 74-100)
Show Request metric only for non-sellers, Offers metric only for non-hosts.

### Controlled Tabs (line 108)
```tsx
<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
```

### Conditional Tab Triggers (lines 113-127)
- Hide Offers trigger if `userType === 'host' && pendingOffers.length === 0`
- Hide Requests trigger if `userType === 'seller'`

### Conditional SellerSalesSection (line 276)
```tsx
{userType !== 'host' && <SellerSalesSection />}
```

### Conditional GetBookedFasterCard (line 253)
```tsx
{userType !== 'seller' && <GetBookedFasterCard />}
```

---

## Benefits

| Aspect | Before | After |
|--------|--------|-------|
| Tab clarity | All users see all tabs | Relevant tabs only |
| Cognitive load | 5 tabs always | 4 tabs for focused users |
| Header identity | Generic "Host" | Contextual (Seller/Host/Vendor) |
| Metric relevance | All 4 metrics | Only applicable metrics |
| UX consistency | Same for everyone | Adapts to business model |

---

## Edge Cases Handled

1. **New user with no listings**: Defaults to "Host" mode (most common use case for rentals marketplace)
2. **User changes listing mode**: On next refresh, `userType` recalculates and UI adapts
3. **Host receives an offer**: Offers tab appears even for pure hosts if `pendingOffers.length > 0`
4. **Deep link to hidden tab**: `useEffect` auto-redirects to appropriate tab

