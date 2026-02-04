
# Onboarding Ecosystem Enhancement Plan

## Summary

Complete the "Context-Aware Spotlight Tour" implementation by adding missing target element IDs and enhancing the zero-state onboarding wizard with a more professional, corporate-grade aesthetic.

---

## Current Implementation Status

The core spotlight tour system already exists and is well-implemented:
- Cinema-style SVG mask cutout with dark backdrop
- Animated glow ring around target elements
- Step-by-step navigation with progress dots
- localStorage persistence for completion state
- Auto-scroll to target elements

**What's missing**: Target element IDs that the tour references.

---

## Changes Required

### 1. Add Target IDs to DashboardLayout.tsx

The mode switcher needs an ID for the first tour step:

```text
Location: src/components/layout/DashboardLayout.tsx
Element: Mode switcher container (around line 117-142)
Add: id="mode-switch-container"
```

This allows the spotlight to highlight the Buying/Hosting toggle.

---

### 2. Add Target IDs to ShopperDashboard.tsx

For the shopper tour to work:

```text
Location: src/components/dashboard/ShopperDashboard.tsx

Change 1: Zero-state hero
- Line 25 (DiscoveryHeroCard wrapper)
- Add: id="discovery-hero" wrapper div

Change 2: Add BecomeHostCard
- Import and render BecomeHostCard component
- Wrap with id="become-host-card"
- Only show for non-hosts in zero-state
```

---

### 3. Verify HostDashboard.tsx IDs

Current status:
- `id="storefront-button"` - Already exists (line 93)
- `id="inventory-tab"` - Missing

The host tour references `inventory-tab` but the current implementation uses URL-based tabs in the sidebar, not visible tabs in the dashboard. 

**Solution**: Update the tour step to reference the sidebar navigation item instead, OR add an ID to a relevant element on the overview page.

---

### 4. Enhance HostOnboardingWizard.tsx (Optional Polish)

Upgrade from basic cards to the corporate-grade styling:

**Current Features:**
- Two path cards (Rental Fleet / Asset Sales)
- Basic feature lists with checkmarks
- Simple CTA buttons

**Enhancements:**
- Add "Set up your Vendor Profile" header badge
- Improve card visual hierarchy with gradient backgrounds
- Add building/store icons in header badges
- Enhance button variants (dark-shine for rent, emerald for sale)

---

## Implementation Details

### File 1: DashboardLayout.tsx

Add ID to the mode switcher container:

```typescript
// Around line 117
{isHost && (
  <div id="mode-switch-container" className="flex gap-1 bg-muted p-1 rounded-lg">
    <button onClick={() => onModeChange('shopper')} ...>Buying</button>
    <button onClick={() => onModeChange('host')} ...>Hosting</button>
  </div>
)}
```

---

### File 2: ShopperDashboard.tsx

Add IDs to zero-state elements and include BecomeHostCard:

```typescript
// Import
import BecomeHostCard from './BecomeHostCard';
import { useAuth } from '@/contexts/AuthContext';

// Inside component
const { hasRole } = useAuth();
const isHost = hasRole('host');

// Zero-state return (around line 22-29)
if (!isLoading && bookings.length === 0) {
  return (
    <div className="space-y-8">
      <div id="discovery-hero">
        <DiscoveryHeroCard />
      </div>
      <DiscoveryGrid />
      {!isHost && (
        <div id="become-host-card">
          <BecomeHostCard />
        </div>
      )}
    </div>
  );
}
```

---

### File 3: Update DashboardOnboarding.tsx Tour Steps

The current `inventory-tab` reference won't work since tabs moved to sidebar. Update to target a visible element:

**Option A**: Change target to storefront button area (already works)

**Option B**: Add a new visible element in HostDashboard overview that can be spotlighted

Recommended: Keep the tour focused on the most impactful elements:
1. Mode Switch (how to toggle roles)
2. Storefront Button (public profile link)
3. "Add Asset" button (primary action)

Updated host steps:

```typescript
const hostSteps: Step[] = [
  {
    targetId: 'mode-switch-container',
    title: 'Two Modes, One Account',
    description: 'Switch between "Buying" and "Hosting" instantly. No need to log out.',
    position: 'bottom',
    align: 'end'
  },
  {
    targetId: 'storefront-button',
    title: 'Your Public Storefront',
    description: 'This is your digital business card. Share this link to drive direct bookings.',
    position: 'bottom',
    align: 'start'
  },
  {
    targetId: 'add-asset-button',
    title: 'List Your First Asset',
    description: 'Add a food truck, trailer, or kitchen to start earning revenue.',
    position: 'bottom',
    align: 'end'
  }
];
```

Then add `id="add-asset-button"` to the "Add Asset" button in HostDashboard.

---

### File 4: HostOnboardingWizard.tsx (Visual Enhancement)

Enhance the corporate styling:

```typescript
// Update the header section
<Card className="border-0 shadow-xl bg-gradient-to-br from-card to-muted/20">
  <CardContent className="p-8 text-center">
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full 
                    bg-primary/10 text-primary text-sm font-medium mb-5">
      <Building2 className="h-4 w-4" />
      Set up your Vendor Profile
    </div>
    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
      Welcome to the professional side of Vendibook.
    </h2>
    <p className="text-muted-foreground max-w-lg mx-auto">
      Choose how you want to operate. You can always add more listing types later.
    </p>
  </CardContent>
</Card>

// Update card buttons
<Button variant="dark-shine" className="w-full">
  Start Rental Business
  <ArrowRight className="h-4 w-4 ml-2" />
</Button>

<Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
  List Item for Sale
  <ArrowRight className="h-4 w-4 ml-2" />
</Button>
```

---

## Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `src/components/layout/DashboardLayout.tsx` | Minor | Add `id="mode-switch-container"` |
| `src/components/dashboard/ShopperDashboard.tsx` | Medium | Add wrapper IDs, import BecomeHostCard |
| `src/components/dashboard/HostDashboard.tsx` | Minor | Add `id="add-asset-button"` to Add Asset button |
| `src/components/onboarding/DashboardOnboarding.tsx` | Minor | Update host steps to use correct target IDs |
| `src/components/dashboard/HostOnboardingWizard.tsx` | Medium | Enhance visual styling |

---

## Technical Notes

### Spotlight Positioning

The current implementation uses `position: 'fixed'` with calculated coordinates based on `getBoundingClientRect()`. This works well but has one consideration:

- The popover calculates position on mount and listens to resize/scroll
- For elements in the sidebar (desktop), the position will be correct
- For elements that may be off-screen initially, `scrollIntoView` is called first

### localStorage Key

The completion state uses: `vendibook_dashboard_onboarding_v1`

If you want to reset for testing, clear this key or increment the version.

### Mode-Specific Tours

The current implementation already handles mode-specific tours:
- Host mode: Shows management-focused steps
- Shopper mode: Shows discovery-focused steps

This means users get a relevant tour based on which mode they're viewing.

---

## Expected User Experience

### First-Time Host Flow

1. User logs in with host role
2. 1-second delay for UI to settle
3. Screen dims with spotlight on mode switcher
4. User clicks "Next" -> spotlight moves to storefront button
5. User clicks "Next" -> spotlight moves to Add Asset button
6. User clicks "Finish" -> tour ends, localStorage flagged

### First-Time Shopper Flow

1. User logs in (no host role)
2. 1-second delay
3. Screen dims with spotlight on discovery hero
4. User clicks "Next" -> spotlight moves to BecomeHostCard
5. User clicks "Finish" -> tour ends

---

## Accessibility Considerations

The current implementation includes:
- `aria-label="Skip tour"` on close button
- Keyboard-accessible buttons
- Focus trap within the popover

No additional accessibility work needed.
