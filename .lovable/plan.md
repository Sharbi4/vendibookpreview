
# Corporate Command Center Dashboard Redesign

## Overview

Transform the dashboard from a consumer-app style interface (big icons, decorative cards, "Welcome back" banners) into a professional, data-dense "Command Center" suitable for corporate fleet managers with multiple assets. This follows the Shopify/Stripe/Airbnb Pro design paradigm.

---

## Current State Analysis

### What Needs to Change

| Issue | Current State | Target State |
|-------|---------------|--------------|
| Hero Section | Large gray banner with centered title, decorative Quick Action cards | Clean sticky header with email/identity context |
| Quick Action Cards | 5 icon cards (Bookings, Purchases, etc.) cluttering the hero | Removed - consolidated into sub-dashboards |
| Account Info Card | Separate card at bottom showing email, roles, verification | Moved to sticky header or removed (redundant) |
| Verification Progress | Always visible card | Only shown if not verified (alert style) |
| Storefront Button | Missing | Prominent in HostDashboard header |
| View Modes | Grid cards only | Grid + Table toggle for corporate users |
| Host Tools Section | Separate card at bottom | Consolidated or removed |

---

## Phase 1: Dashboard.tsx - The Clean Shell

### Changes

1. **Remove the decorative Hero Section** (lines 72-174)
   - Remove the gray `bg-muted/30` hero section
   - Remove the 5 Quick Action Cards (Bookings, Purchases, Rentals, Favorites, Account)
   - Replace with a compact sticky header

2. **Create Professional Sticky Header**
   - Left: Mode icon + Title + User email (small text)
   - Right: Context toggle (for hosts)
   - Uses `sticky top-16 z-30 bg-background/95 backdrop-blur`

3. **Move Verification to Alert Position**
   - Only show if `!isVerified`
   - Compact alert-style banner instead of full card

4. **Remove Account Info Card** (lines 191-273)
   - This info is redundant when shown in header
   - Keeps dashboard focused on operations

### New Structure

```text
┌──────────────────────────────────────────────────────────────┐
│ HEADER (Global Nav)                                          │
├──────────────────────────────────────────────────────────────┤
│ STICKY CONTEXT BAR                                           │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ [Icon] Vendor Console • user@email.com   [Buy|Host]    │  │
│ └────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│ VERIFICATION ALERT (only if !isVerified)                     │
├──────────────────────────────────────────────────────────────┤
│ HOST/SHOPPER DASHBOARD (Full Content)                        │
└──────────────────────────────────────────────────────────────┘
```

---

## Phase 2: HostDashboard.tsx - Corporate Operations

### Key Changes

1. **Add "View Storefront" Button**
   - Prominently placed next to "New Listing" button
   - Links to `/profile/{user.id}`
   - Uses `ExternalLink` icon to indicate it opens the public view

2. **Add Grid/Table View Toggle**
   - For users with 3+ listings (power users)
   - Grid mode: Current HostListingCard layout
   - Table mode: New OperationsTable component

3. **Reorganize Tabs**
   - Overview (default): Action items + quick analytics
   - Inventory: Listings with view toggle
   - Bookings: For rentals
   - Financials: Revenue + Stripe

4. **Remove "Host Tools" Card** (lines 333-350)
   - Clutter - can be accessed from main navigation

5. **Move SellerSalesSection into Financials Tab**
   - Consolidates financial data in one place

### New Header Structure

```text
┌──────────────────────────────────────────────────────────────┐
│ Overview                                                      │
│ "Manage fleet availability and revenue."                      │
│                                   [Storefront] [Add Asset]    │
└──────────────────────────────────────────────────────────────┘
```

---

## Phase 3: Create OperationsTable Component

### Purpose
A dense data table for fleet managers to monitor all assets at a glance without scrolling through cards.

### Structure

```text
┌──────────────────────────────────────────────────────────────┐
│ Asset Name        | Status    | Type    | Views | Price | ⋮  │
├──────────────────────────────────────────────────────────────┤
│ Taco Truck LA     | Published | Truck   | 1,234 | $150  | ⋮  │
│ Ghost Kitchen SF  | Paused    | Kitchen |   89  | $200  | ⋮  │
│ Food Trailer OC   | Draft     | Trailer |    0  | $75   | ⋮  │
└──────────────────────────────────────────────────────────────┘
```

### Features
- Sortable columns (future enhancement)
- Quick actions via dropdown menu (View, Edit, Pause/Publish)
- Status badges with colors
- Performance indicators (views, favorites)

---

## Phase 4: HostListingCard Button Cleanup

### Current Issue
Too many buttons with inconsistent styling:
- View, Edit, Availability (outline)
- Make Featured, Notary (dark-shine)
- Pause, Publish, Delete (mixed)

### Solution
Group actions into Primary and Secondary:

```text
┌──────────────────────────────────────────────────────────────┐
│ PRIMARY ACTIONS (Always visible)                             │
│ [View] [Edit] [Calendar]                                     │
│                                                              │
│ MARKETING ACTIONS (Visually separated, amber accent)        │
│ [⭐ Boost] [🛡️ Notary]                                       │
│                                                              │
│ STATUS ACTIONS (Right side)                                  │
│ [Pause/Publish] [🗑️]                                        │
└──────────────────────────────────────────────────────────────┘
```

### Consistent Styling
- All buttons: `h-9 rounded-xl`
- Primary actions: `variant="outline"`
- Marketing upsells: `variant="secondary"` with amber styling
- Publish: `variant="default"`
- Delete: Ghost with destructive colors, pushed to right

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/pages/Dashboard.tsx` | Major refactor | Remove hero/quick actions, add compact sticky header |
| `src/components/dashboard/HostDashboard.tsx` | Major refactor | Add Storefront button, view toggle, reorganize tabs |
| `src/components/dashboard/OperationsTable.tsx` | Create | New table component for fleet management |
| `src/components/dashboard/HostListingCard.tsx` | Minor update | Consistent button styling and grouping |

---

## Detailed Code Changes

### Dashboard.tsx (lines 66-280)

**Remove:**
- Hero section with gray background (lines 72-174)
- Quick Action Cards grid
- Account Info Card (lines 192-273)

**Add:**
- Compact sticky context bar with:
  - Mode icon (Store for Host, LayoutGrid for Shopper)
  - Title ("Vendor Console" / "My Activity")
  - User email in small text
  - Toggle switch (for hosts)
- Verification alert (only if `!isVerified`, compact banner style)

### HostDashboard.tsx

**Header Section (lines 86-100):**
```tsx
<div className="flex items-center justify-between">
  <div>
    <h2 className="text-xl font-semibold">Overview</h2>
    <p className="text-sm text-muted-foreground">
      {userType === 'seller' ? 'Manage your sales pipeline.' : 'Manage fleet availability and revenue.'}
    </p>
  </div>
  <div className="flex items-center gap-2">
    <Button variant="outline" size="sm" asChild className="rounded-xl">
      <Link to={`/profile/${user?.id}`}>
        <ExternalLink className="h-4 w-4 mr-1.5" />
        My Storefront
      </Link>
    </Button>
    <Button variant="dark-shine" size="sm" asChild className="rounded-xl">
      <Link to="/list">
        <Plus className="h-4 w-4 mr-1.5" />
        Add Asset
      </Link>
    </Button>
  </div>
</div>
```

**View Toggle (new state and UI):**
```tsx
const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
const isPowerUser = listings.length > 2;

// In the Inventory tab header:
{isPowerUser && (
  <div className="flex items-center gap-1">
    <Button 
      variant={viewMode === 'grid' ? 'default' : 'ghost'} 
      size="icon" 
      className="h-8 w-8"
      onClick={() => setViewMode('grid')}
    >
      <Grid3X3 className="h-4 w-4" />
    </Button>
    <Button 
      variant={viewMode === 'table' ? 'default' : 'ghost'} 
      size="icon" 
      className="h-8 w-8"
      onClick={() => setViewMode('table')}
    >
      <ListFilter className="h-4 w-4" />
    </Button>
  </div>
)}
```

**Tab Restructure:**
- Overview: Priority actions + CompactInsights
- Inventory: Listings (grid or table based on toggle)
- Bookings: BookingRequestsSection (if not seller)
- Financials: RevenueAnalyticsCard + SellerSalesSection (consolidated)

**Remove:**
- Host Tools section (lines 333-350)
- Standalone SellerSalesSection (moves to Financials tab)

### New OperationsTable.tsx

```tsx
// Key features:
- Table with columns: Asset Name (with image), Status, Type, Performance, Price, Actions
- Status badges with semantic colors (emerald/amber/gray)
- Performance shows view count with Eye icon
- Actions dropdown with Edit, Pause/Publish options
- Links to listing detail pages
```

### HostListingCard.tsx Button Cleanup

**Lines 265-349 refactored to:**
```tsx
<div className="flex items-center gap-2 mt-4 pt-4 border-t border-border flex-wrap">
  {/* Primary Actions - Always visible */}
  <Button variant="outline" size="sm" className="h-9 rounded-xl" asChild>
    <Link to={`/listing/${listing.id}`}>
      <Eye className="h-4 w-4 mr-1.5" />View
    </Link>
  </Button>
  <Button variant="outline" size="sm" className="h-9 rounded-xl" asChild>
    <Link to={`/create-listing/${listing.id}`}>
      <Edit2 className="h-4 w-4 mr-1.5" />Edit
    </Link>
  </Button>
  {isRental && (
    <Button variant="outline" size="sm" className="h-9 rounded-xl" onClick={() => setShowCalendar(true)}>
      <Calendar className="h-4 w-4 mr-1.5" />Availability
    </Button>
  )}
  
  {/* Marketing Upsells - Amber accent */}
  {isPublished && !isFeatured && (
    <Button 
      variant="secondary" 
      size="sm" 
      className="h-9 rounded-xl bg-amber-100 text-amber-700 hover:bg-amber-200"
      onClick={handleFeaturedClick}
    >
      <Star className="h-4 w-4 mr-1.5" />Boost
    </Button>
  )}
  {isPublished && isSale && !hasNotary && (
    <Button 
      variant="secondary" 
      size="sm" 
      className="h-9 rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-200"
      onClick={handleNotaryCheckout}
    >
      <Shield className="h-4 w-4 mr-1.5" />Notary
    </Button>
  )}
  
  {/* Spacer */}
  <div className="flex-1" />
  
  {/* Status Actions - Right aligned */}
  {listing.status === 'published' && onPause && (
    <Button variant="outline" size="sm" className="h-9 rounded-xl" onClick={() => onPause(listing.id)}>
      <Pause className="h-4 w-4 mr-1.5" />Pause
    </Button>
  )}
  {(listing.status === 'draft' || listing.status === 'paused') && onPublish && (
    <Button size="sm" className="h-9 rounded-xl" onClick={() => onPublish(listing.id)}>
      <Play className="h-4 w-4 mr-1.5" />Publish
    </Button>
  )}
  {onDelete && (
    <Button 
      variant="ghost" 
      size="icon"
      className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10"
      onClick={() => onDelete(listing.id)}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )}
</div>
```

---

## Visual Summary

### Before (Dashboard.tsx)

```text
┌──────────────────────────────────────────────────────────────┐
│ HERO (Gray banner)                                           │
│ "Manage Listings"                                            │
│ [Toggle Switch]                                              │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                          │
│ │Book││Purch││Rent││Fav ││Acct│  <-- Clutter               │
│ └────┘ └────┘ └────┘ └────┘ └────┘                          │
├──────────────────────────────────────────────────────────────┤
│ [Verification Card - Always visible]                         │
├──────────────────────────────────────────────────────────────┤
│ HOST DASHBOARD CONTENT                                       │
├──────────────────────────────────────────────────────────────┤
│ [Account Info Card with Email, Roles, Verification]         │
└──────────────────────────────────────────────────────────────┘
```

### After (Dashboard.tsx)

```text
┌──────────────────────────────────────────────────────────────┐
│ GLOBAL HEADER                                                │
├──────────────────────────────────────────────────────────────┤
│ STICKY CONTEXT BAR (Compact)                                 │
│ [🏪] Vendor Console • user@email.com    [Buying ○─── Hosting]│
├──────────────────────────────────────────────────────────────┤
│ ⚠️ Complete identity verification [Verify →]  (if needed)    │
├──────────────────────────────────────────────────────────────┤
│ HOST DASHBOARD CONTENT                                       │
│ (Takes full width, no redundant cards)                       │
└──────────────────────────────────────────────────────────────┘
```

### Before (HostDashboard - Listings Tab)

```text
┌──────────────────────────────────────────────────────────────┐
│ [Header + New Listing button]                                │
├──────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ LISTING CARD 1 (Large)                                  │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ LISTING CARD 2 (Large)                                  │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ... scroll to see more ...                                   │
└──────────────────────────────────────────────────────────────┘
```

### After (HostDashboard - Inventory Tab with Table View)

```text
┌──────────────────────────────────────────────────────────────┐
│ Overview                           [Storefront] [Add Asset]  │
│ "Manage fleet availability..."     [Grid|Table] toggle       │
├──────────────────────────────────────────────────────────────┤
│ Asset Name      │ Status    │ Type   │ Views │ Price  │ ⋮   │
├──────────────────────────────────────────────────────────────┤
│ Taco Truck LA   │ Published │ Truck  │ 1,234 │ $150   │ ⋮   │
│ Ghost Kitchen   │ Paused    │ Kitchen│    89 │ $200   │ ⋮   │
│ Food Trailer    │ Draft     │ Trailer│     0 │ $75    │ ⋮   │
└──────────────────────────────────────────────────────────────┘
```

---

## Benefits

| Metric | Before | After |
|--------|--------|-------|
| Visual noise | High (decorative cards, heroes) | Low (data-focused) |
| Corporate readiness | Basic (card-only view) | Pro (grid + table toggle) |
| Storefront visibility | Hidden | Prominent button |
| Button consistency | Mixed sizes/styles | Unified h-9 rounded-xl |
| Information density | Low | High (for power users) |
| Mobile experience | Okay | Preserved (grid default) |

---

## Implementation Order

1. Create `OperationsTable.tsx` component
2. Refactor `HostDashboard.tsx` (add Storefront button, view toggle, reorganize tabs)
3. Refactor `Dashboard.tsx` (remove hero, add compact header)
4. Update `HostListingCard.tsx` (consistent button styling)
