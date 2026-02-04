

# Dashboard Refactor: Apple/Amazon "Action-First" Zero State Pattern

## Overview

This plan implements the marketplace design principles outlined in the request: transforming empty states into onboarding/discovery opportunities, prioritizing "Action Required" over passive reporting, and ensuring the Switch Pattern feels like Turo's seamless context switching.

---

## Current State Analysis

### What's Working Well
1. URL-based mode switching (`?view=host` / `?view=shopper`) is already implemented
2. `HostDashboard` already has smart `userType` detection (seller/host/hybrid)
3. `NextStepCard` prioritizes actions intelligently
4. Real-time subscriptions for instant updates

### What Needs Improvement

| Issue | Current Behavior | Target Behavior |
|-------|-----------------|-----------------|
| Empty Shopper Dashboard | Shows "No bookings yet" with empty stats | Shows Discovery Grid (like Amazon homepage) |
| Empty Host Dashboard | Shows "No listings yet" message | Shows Onboarding Wizard with 2 paths (Rent vs Sell) |
| Header Clutter | Sparkles badge, hero section with stats always visible | Clean Apple-style header, contextual labels |
| Stats Overload | Always shows 4 stat cards (even if all zeros) | Hide stats for new users, show Discovery instead |
| Action vs Reporting | Stats displayed equally with action items | "Action Required" alert banner takes priority |

---

## Phase 1: Dashboard.tsx Header Cleanup

### Changes
1. Simplify the hero section to be more compact
2. Make the mode switch more prominent with clear visual context
3. Update title to be action-oriented:
   - Host mode: "Host Command Center" or "Manage Listings"
   - Shopper mode: "My Trips & Orders"
4. Remove the generic "Your Dashboard" subtitle, replace with contextual hints

### Header Structure

```text
┌──────────────────────────────────────────────────────────────┐
│  [Welcome, John]                                             │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Buy / Rent  ○────────  Host / Sell                      ││
│  │                  ^^^^                                   ││
│  │                 Toggle                                  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  [Quick Actions: Bookings | Purchases | Rentals | Favorites]│
└──────────────────────────────────────────────────────────────┘
```

---

## Phase 2: ShopperDashboard.tsx - Discovery-First Zero State

### Current Problem
When `bookings.length === 0`, user sees:
- 4 stat cards all showing "0"
- Empty tabs with "No pending requests"
- Browse Listings CTA buried below

### Solution: Amazon Homepage Pattern

When the shopper has no activity, show a **Discovery Grid** instead of empty metrics:

```text
┌──────────────────────────────────────────────────────────────┐
│  🔍 Ready to start?                                          │
│                                                              │
│  "Find the perfect truck, kitchen, or parking spot today."  │
│                                                              │
│  [Start Browsing] (Primary CTA)                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  DISCOVER CATEGORIES                                         │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐             │
│ │  🚚 Trucks  │ │  👨‍🍳 Kitchens│ │  📍 Lots    │             │
│ │  Browse →   │ │  Browse →   │ │  Browse →   │             │
│ └─────────────┘ └─────────────┘ └─────────────┘             │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  [Become a Host Banner - if not already a host]             │
└──────────────────────────────────────────────────────────────┘
```

### Active State (has bookings)
- Show **Upcoming & Pending** section prominently at top
- Move Past Activity to collapsed/tabbed section below
- Keep the Become Host upsell in sidebar

### Implementation
1. Add conditional rendering based on `bookings.length === 0`
2. Create `DiscoveryGrid` component with category cards linking to `/search?category=...`
3. Keep existing `BecomeHostCard` for non-hosts

---

## Phase 3: HostDashboard.tsx - Onboarding Wizard Zero State

### Current Problem
When `listings.length === 0`:
- Shows "No listings yet" message
- Generic "New Listing" button
- User doesn't know the difference between rent/sell paths

### Solution: Two-Path Onboarding Wizard

```text
┌──────────────────────────────────────────────────────────────┐
│  Welcome to your Host Dashboard                              │
│                                                              │
│  "You're all set up. Now, what would you like to list?"      │
│                                                              │
│  ┌─────────────────────────┐  ┌─────────────────────────┐   │
│  │  📅 RENT OUT AN ASSET   │  │  💰 SELL AN ASSET       │   │
│  │                         │  │                         │   │
│  │  Generate recurring     │  │  List your equipment    │   │
│  │  income from your truck,│  │  for sale to thousands  │   │
│  │  trailer, or kitchen.   │  │  of verified buyers.    │   │
│  │                         │  │                         │   │
│  │  [Start Listing →]      │  │  [Sell Now →]           │   │
│  └─────────────────────────┘  └─────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### Implementation
1. Add conditional rendering when `listings.length === 0`
2. Create `HostOnboardingWizard` component with two path cards
3. Link to `/list?mode=rent` and `/list?mode=sale`

---

## Phase 4: Action Required Alert Banner

### Concept
Instead of burying pending requests in stats, show a prominent **Action Required** banner when the host has items needing attention.

```text
┌──────────────────────────────────────────────────────────────┐
│  ⚠️ ACTION REQUIRED                                          │
│                                                              │
│  You have 3 pending requests and 2 new offers.               │
│                                                              │
│  [Review Requests]                                           │
└──────────────────────────────────────────────────────────────┘
```

### Trigger Conditions
- `bookingStats.pending > 0`
- `pendingOffers.length > 0`
- Draft listings with incomplete setup

### Implementation
Enhance existing `NextStepCard` or create dedicated `ActionRequiredBanner` component that appears above all content when actions are needed.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Simplify header, update titles to be action-oriented |
| `src/components/dashboard/ShopperDashboard.tsx` | Add Discovery Grid zero state, reorganize active state |
| `src/components/dashboard/HostDashboard.tsx` | Add Onboarding Wizard zero state, enhance Action Required visibility |
| `src/components/dashboard/DiscoveryGrid.tsx` | Create new component for category cards |
| `src/components/dashboard/HostOnboardingWizard.tsx` | Create new component for two-path onboarding |
| `src/components/dashboard/ActionRequiredBanner.tsx` | Create prominent alert banner |

---

## Detailed Implementation

### Dashboard.tsx Changes (lines 72-117)

1. **Simplify hero section** - Remove Sparkles badge, make title dynamic
2. **Update mode switch labels** - Already done ("Buy / Rent" / "Host / Sell")
3. **Add transition animations** - Smooth fade between modes

```tsx
// Title changes based on mode
<h1 className="text-2xl md:text-3xl font-bold">
  {currentMode === 'host' ? 'Manage Listings' : 'My Trips & Orders'}
</h1>

// Subtitle is contextual
<p className="text-muted-foreground">
  {currentMode === 'host' 
    ? 'Reservations, offers, and earnings' 
    : 'Bookings, purchases, and favorites'}
</p>
```

### ShopperDashboard.tsx - Zero State Logic

```tsx
// Early return for zero state
if (!isLoading && bookings.length === 0 && !hasOffers && !hasPurchases) {
  return (
    <div className="space-y-8">
      <DiscoveryHeroCard />
      <DiscoveryGrid />
      {!isHost && <BecomeHostBanner />}
    </div>
  );
}
```

### HostDashboard.tsx - Zero State Logic

```tsx
// Early return for zero state
if (!isLoading && listings.length === 0) {
  return (
    <div className="space-y-6">
      <HostOnboardingWizard />
    </div>
  );
}

// Active state - show Action Required at top
return (
  <div className="space-y-6">
    {(bookingStats.pending > 0 || pendingOffers.length > 0) && (
      <ActionRequiredBanner 
        pendingRequests={bookingStats.pending}
        pendingOffers={pendingOffers.length}
      />
    )}
    {/* Rest of dashboard */}
  </div>
);
```

---

## New Component: DiscoveryGrid

```tsx
const categories = [
  { title: 'Food Trucks', icon: Truck, href: '/search?category=food-truck', desc: 'Taco trucks, pizza ovens, ice cream' },
  { title: 'Kitchens', icon: ChefHat, href: '/search?category=commercial-kitchen', desc: 'Licensed prep spaces' },
  { title: 'Vendor Lots', icon: MapPin, href: '/search?category=vendor-lot', desc: 'Prime vending locations' },
];

// Grid layout with hover effects, links to filtered search
```

---

## New Component: HostOnboardingWizard

Two large cards side by side:
1. **Rent** - Links to `/list?mode=rent`
2. **Sell** - Links to `/list?mode=sale`

Each card has:
- Icon (Calendar for rent, DollarSign for sell)
- Title
- Description
- CTA button

---

## Visual Summary

```text
BEFORE (Empty Shopper Dashboard):
┌──────────────────────┐
│ Stats: 0 | 0 | 0 | 0 │
│ Empty Tabs           │
│ "No bookings yet"    │
│ [Browse Listings]    │
└──────────────────────┘

AFTER (Discovery Mode):
┌──────────────────────┐
│ "Ready to start?"    │
│ [Start Browsing]     │
│ ┌────┐┌────┐┌────┐   │
│ │🚚  ││👨‍🍳  ││📍  │   │
│ └────┘└────┘└────┘   │
│ [Become a Host]      │
└──────────────────────┘
```

```text
BEFORE (Empty Host Dashboard):
┌──────────────────────┐
│ "No listings yet"    │
│ [New Listing]        │
└──────────────────────┘

AFTER (Onboarding Wizard):
┌──────────────────────┐
│ "What would you      │
│  like to list?"      │
│ ┌────────┐┌────────┐ │
│ │ 📅 RENT ││ 💰 SELL │ │
│ │ Start →││ Start →│ │
│ └────────┘└────────┘ │
└──────────────────────┘
```

---

## Benefits

| Metric | Before | After |
|--------|--------|-------|
| Empty state bounce | High (nothing to do) | Low (discovery paths) |
| Host onboarding clarity | Generic "New Listing" | Clear rent vs sell paths |
| Action visibility | Buried in stats | Prominent alert banner |
| Cognitive load | 5+ sections always visible | Context-appropriate content |
| First-time user experience | Confusing empty tables | Guided discovery/onboarding |

---

## Implementation Order

1. Create `DiscoveryGrid` component
2. Create `HostOnboardingWizard` component
3. Create `ActionRequiredBanner` component
4. Update `ShopperDashboard.tsx` with zero state logic
5. Update `HostDashboard.tsx` with zero state logic and action banner
6. Simplify `Dashboard.tsx` header

