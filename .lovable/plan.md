
# Pro Dashboard Architecture - Turo/Airbnb-Style Navigation System

## Executive Summary

Transform the current dashboard from a simple page with cards into a full "App-like" experience with persistent sidebar navigation (desktop) and bottom navigation (mobile). This creates the "tech-forward" feel expected from modern marketplace platforms like Airbnb, Turo, and DoorDash.

---

## Current State Analysis

### What Exists Today

| Component | Current Behavior | Issue |
|-----------|-----------------|-------|
| `Dashboard.tsx` | Self-contained page with Header + Footer | No persistent navigation between dashboard sections |
| `HostDashboard.tsx` | Internal tabs (Overview/Inventory/Bookings/Financials) | Tabs are local state, not URL-based; no sidebar |
| `ShopperDashboard.tsx` | Internal tabs (Pending/Approved/Past) | Same issues as HostDashboard |
| `Header.tsx` | Global header with dropdown menu | Dashboard controls buried in dropdown |
| Mobile Navigation | Hamburger menu only | No app-like bottom nav bar |

### What's Missing

1. **Persistent Sidebar** (Desktop) - Always-visible navigation for dashboard sections
2. **Bottom Navigation** (Mobile) - Thumb-friendly app-like nav bar
3. **URL-Based Tabs** - Navigation state persisted in URL for deep linking
4. **Mode Switcher in Sidebar** - Host/Shopper toggle always accessible
5. **User Profile Snippet** - Avatar + name visible in sidebar

---

## Architecture Overview

```text
Desktop Layout:
┌──────────────────────────────────────────────────────────────────┐
│  Mobile Header (hidden on desktop)                               │
├────────────┬─────────────────────────────────────────────────────┤
│            │  Breadcrumb: Dashboard / Overview                   │
│  SIDEBAR   ├─────────────────────────────────────────────────────┤
│  (240px)   │                                                     │
│            │                                                     │
│  - Avatar  │           MAIN CONTENT AREA                         │
│  - Mode    │           (HostDashboard / ShopperDashboard)        │
│    Toggle  │                                                     │
│            │                                                     │
│  SECTIONS  │                                                     │
│  ─────────│                                                     │
│  Overview  │                                                     │
│  Listings  │                                                     │
│  Bookings  │                                                     │
│  Inbox     │                                                     │
│            │                                                     │
│  ACCOUNT   │                                                     │
│  ─────────│                                                     │
│  Wallet    │                                                     │
│  Settings  │                                                     │
│            │                                                     │
│  [Sign Out]│                                                     │
├────────────┴─────────────────────────────────────────────────────┤
│  Bottom Nav (hidden on desktop)                                  │
└──────────────────────────────────────────────────────────────────┘

Mobile Layout:
┌─────────────────────────────────────┐
│  ☰ Logo    "My Dashboard"    🔔     │  <-- Mobile Header
├─────────────────────────────────────┤
│                                     │
│      MAIN CONTENT AREA              │
│      (Full width, scrollable)       │
│                                     │
│                                     │
├─────────────────────────────────────┤
│  🏠    🛒    💬    👤              │  <-- Bottom Nav (Fixed)
│ Home  Shop  Inbox Account           │
└─────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Create DashboardLayout Component

**New File:** `src/components/layout/DashboardLayout.tsx`

This is the core layout shell that wraps dashboard content and provides:

1. **Desktop Sidebar** (hidden on mobile)
   - User avatar + name + email snippet
   - Mode toggle (Buying/Hosting) with pill-style switcher
   - Navigation groups with icons and active states
   - Sign out button at bottom

2. **Mobile Header** (hidden on desktop)
   - Hamburger menu trigger
   - Logo/title
   - Notification bell

3. **Mobile Slide-Out Menu** (using Sheet component)
   - Same content as sidebar
   - Slides in from left when hamburger tapped

4. **Mobile Bottom Navigation** (fixed at bottom)
   - 4 core actions: Home, Shop, Inbox, Account
   - Active state highlighting
   - Safe area padding for notched devices

5. **Desktop Top Bar**
   - Breadcrumb navigation
   - Help & Support link
   - Notification center

**Navigation Configuration:**

```typescript
// Host Mode Navigation
const hostNavigation = [
  {
    title: 'Management',
    items: [
      { title: 'Overview', icon: LayoutGrid, href: '/dashboard' },
      { title: 'Listings', icon: Truck, href: '/dashboard?tab=inventory' },
      { title: 'Reservations', icon: CalendarDays, href: '/dashboard?tab=bookings' },
      { title: 'Inbox', icon: MessageSquare, href: '/messages' },
    ]
  },
  {
    title: 'Account',
    items: [
      { title: 'Wallet', icon: CreditCard, href: '/transactions' },
      { title: 'Settings', icon: Settings, href: '/account' },
    ]
  }
];

// Shopper Mode Navigation
const shopperNavigation = [
  {
    title: 'Activity',
    items: [
      { title: 'Trips', icon: CalendarDays, href: '/dashboard' },
      { title: 'Favorites', icon: Heart, href: '/favorites' },
      { title: 'Inbox', icon: MessageSquare, href: '/messages' },
    ]
  },
  // ... Account group same as above
];
```

**Props Interface:**

```typescript
interface DashboardLayoutProps {
  children: React.ReactNode;
  mode: 'host' | 'shopper';
  onModeChange: (mode: 'host' | 'shopper') => void;
}
```

---

### Phase 2: Update Dashboard.tsx

**File:** `src/pages/Dashboard.tsx`

Changes:
1. Remove existing Header/Footer (DashboardLayout handles this)
2. Remove sticky context bar (moved to sidebar)
3. Wrap content in DashboardLayout
4. Pass mode and onModeChange to layout
5. Keep loading state and auth redirect logic

```typescript
// Simplified structure
const Dashboard = () => {
  const { user, isLoading, hasRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const currentMode = searchParams.get('view') === 'host' ? 'host' : 'shopper';
  
  const handleModeChange = (newMode: 'host' | 'shopper') => {
    setSearchParams({ view: newMode });
  };

  // ... auth checks ...

  return (
    <DashboardLayout mode={currentMode} onModeChange={handleModeChange}>
      {currentMode === 'host' ? <HostDashboard /> : <ShopperDashboard />}
    </DashboardLayout>
  );
};
```

---

### Phase 3: Refactor HostDashboard.tsx

**File:** `src/components/dashboard/HostDashboard.tsx`

Changes:
1. Read `tab` from URL search params instead of local state
2. Remove the internal TabsList (navigation is now in sidebar)
3. Keep TabsContent for rendering the correct section
4. Preserve all existing functionality (Stripe, listings, analytics)

```typescript
// URL-controlled tabs
const [searchParams] = useSearchParams();
const tab = searchParams.get('tab') || 'overview';

// Render based on URL tab
return (
  <div className="space-y-6">
    {/* Header with actions - keep */}
    {/* Stats row - keep */}
    
    {/* Content based on tab */}
    {tab === 'overview' && <OverviewContent ... />}
    {tab === 'inventory' && <InventoryContent ... />}
    {tab === 'bookings' && <BookingsContent ... />}
    {tab === 'financials' && <FinancialsContent ... />}
  </div>
);
```

The internal tabs UI is removed because the sidebar now controls navigation via URL params.

---

### Phase 4: Update ShopperDashboard.tsx (Minor)

**File:** `src/components/dashboard/ShopperDashboard.tsx`

Changes:
1. Keep internal tabs for booking status (Pending/Approved/Past) - these are content filters, not navigation
2. Remove the sidebar right column (BecomeHostCard) - this is now accessible via sidebar
3. Simplify to single-column layout

---

## Technical Details

### Sidebar Active State Logic

```typescript
const isActive = (href: string) => {
  // Exact path match
  if (location.pathname === href.split('?')[0]) {
    // If href has query params, check those too
    if (href.includes('?')) {
      const param = href.split('?')[1];
      return location.search.includes(param);
    }
    // Root match (e.g., /dashboard with no tab = overview)
    return !location.search.includes('tab=');
  }
  return false;
};
```

### Mode Toggle Styling

```typescript
// Pill-style toggle in sidebar
<div className="flex gap-1 bg-muted p-1 rounded-lg">
  <button
    onClick={() => onModeChange('shopper')}
    className={cn(
      "flex-1 text-xs font-medium py-1.5 rounded-md transition-all",
      mode === 'shopper' 
        ? "bg-background shadow-sm text-foreground" 
        : "text-muted-foreground hover:text-foreground"
    )}
  >
    Buying
  </button>
  <button
    onClick={() => onModeChange('host')}
    className={cn(
      "flex-1 text-xs font-medium py-1.5 rounded-md transition-all",
      mode === 'host' 
        ? "bg-background shadow-sm text-foreground" 
        : "text-muted-foreground hover:text-foreground"
    )}
  >
    Hosting
  </button>
</div>
```

### Mobile Bottom Nav Safe Area

```typescript
// Uses safe-area-inset for iPhone X+ notch
<nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 pb-safe">
  {/* pb-safe is a Tailwind utility that adds padding-bottom: env(safe-area-inset-bottom) */}
```

Add to tailwind.config.js:
```javascript
theme: {
  extend: {
    padding: {
      'safe': 'env(safe-area-inset-bottom)',
    },
  },
}
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/layout/DashboardLayout.tsx` | **Create** | New layout component with sidebar + bottom nav |
| `src/pages/Dashboard.tsx` | **Modify** | Simplify to use DashboardLayout, remove Header/Footer |
| `src/components/dashboard/HostDashboard.tsx` | **Modify** | Remove TabsList, read tab from URL, simplify structure |
| `src/components/dashboard/ShopperDashboard.tsx` | **Modify** | Remove sidebar column, keep internal status tabs |
| `tailwind.config.ts` | **Modify** | Add `pb-safe` utility for bottom nav safe area |

---

## Component Dependencies

```text
DashboardLayout.tsx uses:
├── Sheet, SheetContent, SheetTrigger (existing)
├── Button (existing)
├── Avatar, AvatarFallback, AvatarImage (existing)
├── ScrollArea (existing)
├── useAuth (existing)
├── useLocation, Link, useNavigate (react-router-dom)
└── NotificationCenter (existing)
```

No new dependencies required - all UI components already exist.

---

## Key Benefits

| Metric | Before | After |
|--------|--------|-------|
| Clicks to access Settings | 2 (menu dropdown) | 1 (sidebar always visible) |
| Navigation visibility | Hidden in dropdown | Always visible |
| Mobile experience | Hamburger menu only | App-like bottom nav |
| URL deep linking | Local state only | Full URL support |
| Mode switching | Sticky bar at top | Sidebar toggle (persistent) |
| Scalability | Add items to dropdown | Add line to nav config |

---

## Accessibility Considerations

1. **Keyboard Navigation**: All sidebar items are keyboard accessible
2. **Screen Readers**: Proper ARIA labels on navigation groups
3. **Focus Management**: Focus trap in mobile sheet menu
4. **High Contrast**: Uses semantic color tokens for active states

---

## Mobile-First Responsive Behavior

| Breakpoint | Sidebar | Bottom Nav | Header |
|------------|---------|------------|--------|
| `< 768px` (mobile) | Hidden (Sheet) | Visible | Mobile header |
| `>= 768px` (tablet+) | Visible (240px) | Hidden | Desktop top bar |

The transition is handled with Tailwind's `md:` prefix:
- `md:hidden` - Hide on desktop
- `hidden md:flex` - Show on desktop only
