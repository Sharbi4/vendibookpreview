

# Dashboard Mode Switch Pattern: Strict Role Separation

## Problem Analysis

The current Dashboard implementation suffers from **Context Contamination**:

**Current State (Dashboard.tsx lines 156-189):**
- Uses in-page Tabs to toggle between "As Host" and "As Renter" views
- Both modes are equally prominent, causing cognitive overload
- New users see "Host" content before they even have listings
- No clear upsell path for shoppers to become hosts

**User Psychology Issue:**
- **Shopper mindset**: "I want to find and book things" (spending money)
- **Host mindset**: "I want to manage my business" (earning money)
- Mixing these creates confusion about which "hat" the user is wearing

---

## Solution: The "Switch" Pattern

Implement a URL-based mode system (like Airbnb) where the entire UI context shifts based on `?view=host` or `?view=shopper`.

```text
┌──────────────────────────────────────────────────────┐
│ Dashboard.tsx (Traffic Controller)                   │
│ ┌──────────────────────────────────────────────────┐ │
│ │ URL: /dashboard               → ShopperDashboard │ │
│ │ URL: /dashboard?view=host     → HostDashboard    │ │
│ │ URL: /dashboard?view=shopper  → ShopperDashboard │ │
│ └──────────────────────────────────────────────────┘ │
│                                                      │
│ Mode Switch Toggle (only visible for hosts)          │
│ ┌─────────────┬─────────────┐                        │
│ │   Buying    │   Hosting   │                        │
│ └─────────────┴─────────────┘                        │
└──────────────────────────────────────────────────────┘
```

---

## Phase 1: Dashboard.tsx Refactor

### Current Structure (lines 156-189):
```tsx
{isHost && isShopper ? (
  <Tabs defaultValue="host">
    <TabsTrigger value="host">As Host</TabsTrigger>
    <TabsTrigger value="renter">As Renter</TabsTrigger>
    <TabsContent value="host"><HostDashboard /></TabsContent>
    <TabsContent value="renter"><ShopperDashboard /></TabsContent>
  </Tabs>
) : (
  {isHost && <HostDashboard />}
  {!isHost && <ShopperDashboard />}
)}
```

### New Structure:
```tsx
// URL-based mode detection
const [searchParams, setSearchParams] = useSearchParams();
const currentMode = searchParams.get('view') === 'host' ? 'host' : 'shopper';

// Toggle function
const toggleMode = (checked: boolean) => {
  setSearchParams({ view: checked ? 'host' : 'shopper' });
};

// Render mode switch (only for hosts)
{isHost && (
  <div className="flex items-center gap-3">
    <Label>Buying</Label>
    <Switch checked={currentMode === 'host'} onCheckedChange={toggleMode} />
    <Label>Hosting</Label>
  </div>
)}

// Render dashboard based on mode
{currentMode === 'host' ? <HostDashboard /> : <ShopperDashboard />}
```

### Key Changes:
1. Replace `react` Tabs with `useSearchParams` URL state
2. Default to "shopper" view for everyone
3. Add elegant toggle switch in header (only for hosts)
4. Remove the existing Tab-based switching
5. Simplify header to show dynamic title based on mode

---

## Phase 2: ShopperDashboard.tsx Enhancement

### Add "Become a Host" Upsell Sidebar

Transform the single-column layout to a 2-column layout on desktop:

```text
┌────────────────────────────────────────────────────────────┐
│ ShopperDashboard                                           │
├────────────────────────────────────┬───────────────────────┤
│ LEFT (lg:col-span-8)               │ RIGHT (lg:col-span-4) │
│ ┌────────────────────────────────┐ │ ┌───────────────────┐ │
│ │ Hero CTA (for new users)       │ │ │ "Earn with        │ │
│ └────────────────────────────────┘ │ │  Vendibook"       │ │
│ ┌────────────────────────────────┐ │ │                   │ │
│ │ Stats Row                      │ │ │ • Sell Truck      │ │
│ └────────────────────────────────┘ │ │ • List Kitchen    │ │
│ ┌────────────────────────────────┐ │ │ • List Lot        │ │
│ │ Bookings Tabs                  │ │ │                   │ │
│ └────────────────────────────────┘ │ │ [Create Listing]  │ │
│ ┌────────────────────────────────┐ │ └───────────────────┘ │
│ │ Offers Section                 │ │                       │
│ └────────────────────────────────┘ │  OR (if already host) │
│ ┌────────────────────────────────┐ │ ┌───────────────────┐ │
│ │ Purchases Section              │ │ │ Switch to Hosting │ │
│ └────────────────────────────────┘ │ │ [Go to Host →]    │ │
│                                    │ └───────────────────┘ │
└────────────────────────────────────┴───────────────────────┘
```

### Key Additions:
1. **2-column grid layout**: `grid lg:grid-cols-12 gap-6`
2. **Left column (lg:col-span-8)**: All existing content
3. **Right column (lg:col-span-4)**: Sticky sidebar with:
   - **For non-hosts**: "Earn with Vendibook" upsell card
   - **For hosts**: "Switch to Hosting" quick-action card
4. **Conditional Hero**: Only show browse CTA for new users with no bookings
5. **Mobile**: Stack right column below main content

---

## Phase 3: Create BecomeHostCard Component

New component: `src/components/dashboard/BecomeHostCard.tsx`

### Design Specifications:
- Gradient background with decorative elements
- DollarSign icon as hero
- "Earn with Vendibook" heading
- "Turn your idle assets into income" subtitle
- Three quick-link options:
  - Sell a Food Truck (Truck icon)
  - List a Kitchen (ChefHat icon)
  - List a Vendor Lot (MapPin icon)
- Primary CTA: "Create a Listing" button

---

## Phase 4: Create SwitchToHostCard Component

New component: `src/components/dashboard/SwitchToHostCard.tsx`

### For existing hosts viewing Shopper Dashboard:
- Simple card with "Switch to Hosting" message
- "You have active listings" description
- "Go to Host Dashboard" button with ArrowRight icon
- Links to `/dashboard?view=host`

---

## Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `src/pages/Dashboard.tsx` | Modify | Replace Tabs with URL-based mode switch, add header toggle |
| `src/components/dashboard/ShopperDashboard.tsx` | Modify | Add 2-column layout, integrate sidebar upsell |
| `src/components/dashboard/BecomeHostCard.tsx` | Create | Host upsell component for non-hosts |
| `src/components/dashboard/SwitchToHostCard.tsx` | Create | Quick-switch component for existing hosts |

---

## Technical Details

### Dashboard.tsx Changes (lines 1-280):

1. **Add import**:
```tsx
import { useSearchParams } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
```

2. **Replace Tabs logic** (lines 156-189):
```tsx
// URL-based mode
const [searchParams, setSearchParams] = useSearchParams();
const currentMode = searchParams.get('view') === 'host' ? 'host' : 'shopper';

const toggleMode = (checked: boolean) => {
  setSearchParams({ view: checked ? 'host' : 'shopper' });
};
```

3. **Update header section** (around line 72-78):
- Add mode switch toggle with labels
- Show dynamic title based on currentMode

4. **Simplify content rendering** (lines 156-189):
```tsx
{currentMode === 'host' ? <HostDashboard /> : <ShopperDashboard />}
```

### ShopperDashboard.tsx Changes:

1. **Add grid layout**:
```tsx
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
  <div className="lg:col-span-8 space-y-8">
    {/* Existing content */}
  </div>
  <div className="lg:col-span-4">
    {!isHost ? <BecomeHostCard /> : <SwitchToHostCard />}
  </div>
</div>
```

2. **Add imports**:
```tsx
import { useAuth } from '@/contexts/AuthContext';
import BecomeHostCard from './BecomeHostCard';
import SwitchToHostCard from './SwitchToHostCard';
```

3. **Conditional Hero**: Only show browse CTA for empty state

---

## Benefits

| Before | After |
|--------|-------|
| Tabs imply equal importance | URL modes create clear context |
| Host content always visible | Host content hidden until requested |
| No upsell for shopper-only users | Clear "Become a Host" path |
| Confusing for new users | Clean, focused shopper experience |
| No way to deep-link to mode | `?view=host` enables bookmarking |

---

## Mobile Behavior

- Mode switch appears in header (compact toggle)
- Upsell card stacks below main content
- Touch-friendly toggle sizing
- All animations preserved

