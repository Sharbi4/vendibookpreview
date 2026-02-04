

# Rental-First Marketplace Transformation Plan

## Executive Summary

Transform Vendibook from a generic "Buy or Sell" marketplace into a **Rental-First, Turo/Airbnb-style marketplace** with the philosophy: "Don't buy a food truck. Rent one." This includes a new immersive hero, refined navigation, and a guided onboarding experience for the dashboard.

---

## Current State Analysis

### Homepage (`src/pages/Index.tsx`)
- Uses `HeroWalkthrough` with a carousel-style "Buy or Rent" walkthrough
- Shows both "For Sale" and "For Rent" sections equally
- `SupplySection` focuses on selling/renting generically
- No clear rental-first messaging

### Navigation (`src/components/layout/Header.tsx` & `MobileMenu.tsx`)
- Header has a large search bar, dropdown menu, and mobile hamburger
- No "Active Link" pattern - links don't visually indicate current page
- Mobile menu is a standard slide-in panel, not a "cinema-style" full experience
- Missing the Airbnb-style "Hamburger + Avatar" pill button

### Dashboard Onboarding
- `HostOnboardingWizard.tsx` exists but is basic
- No guided "spotlight tour" for new users
- No onboarding for the context switch feature

---

## Phase 1: New Immersive Hero - `HeroRentalSearch.tsx`

### Concept
Replace `HeroWalkthrough` with an immersive, full-screen hero featuring:
- Dark cinematic background image with gradient overlay
- "Don't buy a food truck. Rent one." headline
- Turo/Airbnb-style floating search pill with: Location, Asset Type, Dates
- Search defaults to `mode=rent`

### Technical Details
- Create new `src/components/home/HeroRentalSearch.tsx`
- Uses existing `hero-food-truck.jpg` as background
- Integrates with existing date picker component (`Calendar`)
- Motion animations using `framer-motion` (already installed)
- Form submits to `/search?mode=rent&location=...&start=...`

### Search Pill Structure
```text
┌──────────────────────────────────────────────────────────────────────┐
│  Where         │  What            │  When           │  [🔍 Search]   │
│  Los Angeles   │  Any Vehicle     │  Add dates      │                │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Phase 2: Rental Benefits Section - `RentalBenefits.tsx`

### Purpose
Replace the generic `SupplySection` messaging with a focused "Why Rent?" value proposition.

### Create `src/components/home/RentalBenefits.tsx`
**Three Key Benefits:**
1. **Low Capital, High Speed** - Test concepts without $50k commitment
2. **Verified & Insured** - ID verification, escrow payments, safety built-in
3. **Flexible Terms** - Weekend festivals to year-long leases

### Design
- Clean 3-column grid on desktop, stacked on mobile
- Each benefit has icon in a rounded container + title + description
- Premium whitespace and typography

---

## Phase 3: Updated Index.tsx Structure

### New Page Flow
1. **HeroRentalSearch** - Full-screen immersive search (replaces `HeroWalkthrough`)
2. **RentalBenefits** - Why rent value prop (new)
3. **ListingsSections** - Keep but reorder: Rentals first, then Sales
4. **PaymentsBanner** - Keep as-is (BNPL is relevant)
5. **BecomeHostSection** - Dark-themed host acquisition CTA (refactored from `SupplySection`)
6. **FinalCTA** - Keep as-is

### Key Changes
- Remove `CategoryCarousels` (clutter)
- Move AI Tools callout to `/list` page where it's contextual
- Remove `HeroWalkthrough` entirely

---

## Phase 4: Navigation Upgrades

### 4.1 Create `ActiveLink.tsx` Component

**File:** `src/components/layout/ActiveLink.tsx`

A reusable link component that:
- Detects current route using `useLocation()`
- Applies active styles (bold text, subtle background pill)
- Supports exact vs prefix matching

### 4.2 Header.tsx Enhancements

**Updates:**
1. **Backdrop Blur** - Add `backdrop-blur-xl` for frosted glass effect on scroll
2. **Center Navigation** - Add tab-style links: "Explore" | "How it Works" | "Dashboard"
3. **Airbnb-Style User Pill** - Replace current dropdown with "hamburger + avatar" pill button
4. **Simplified Right Actions** - "Become a Host" (for non-hosts) + User Pill

```text
┌──────────────────────────────────────────────────────────────┐
│ [Logo]     Explore | How it Works     [Become Host] [☰ 👤]  │
└──────────────────────────────────────────────────────────────┘
```

### 4.3 MobileMenu.tsx - Cinema Experience

**Transform to full-screen experience:**
1. Use `framer-motion` for smooth slide animations
2. Large touch targets (minimum 48px height)
3. Active state indicators (background pill + icon fill)
4. Bottom-anchored CTAs (thumb-zone friendly)
5. Lock body scroll when open

**Structure:**
```text
┌──────────────────────────────────────────────────────────────┐
│  [Avatar] Welcome, John            [X Close]                 │
│           View Profile                                        │
├──────────────────────────────────────────────────────────────┤
│  🏠 Home                                                      │
│  🔍 Explore                                                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                   │
│  📊 Dashboard                                                 │
│  💬 Messages                                                  │
│  📋 Transactions                                              │
│  ❤️ Wishlist                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                   │
│  ➕ Host an Asset  (highlighted)                             │
│  👤 Account                                                   │
├──────────────────────────────────────────────────────────────┤
│  [Log Out]                                                    │
└──────────────────────────────────────────────────────────────┘
```

---

## Phase 5: Dashboard Onboarding Tour

### 5.1 Create `DashboardOnboarding.tsx`

**File:** `src/components/onboarding/DashboardOnboarding.tsx`

A "spotlight tour" component that:
- Shows first-time users key features via dimmed overlay + spotlight effect
- Steps through features: Mode Switch, Storefront Button, Operations Tab
- Uses localStorage to track completion (`vendibook_dashboard_onboarding_v1`)
- Renders after 1-second delay to ensure UI is ready

**Technical Approach:**
- Use `framer-motion` for animations
- Calculate element positions via `getBoundingClientRect()`
- Clip-path or SVG mask for spotlight effect
- Popover positioned relative to target element

### 5.2 Dashboard.tsx Integration

**Add IDs to key elements:**
- `id="mode-switch-container"` on the host/shopper toggle
- `id="storefront-button"` on the View Storefront button (in HostDashboard)
- `id="operations-tab"` on the Inventory tab (or Operations view toggle)

**Mount the onboarding:**
```tsx
const [showOnboarding, setShowOnboarding] = useState(false);

useEffect(() => {
  const hasSeen = localStorage.getItem('vendibook_dashboard_onboarding_v1');
  if (!hasSeen && !isLoading) {
    setTimeout(() => setShowOnboarding(true), 1000);
  }
}, [isLoading]);
```

### 5.3 Tour Steps

**For Host Mode:**
1. Mode Switch - "Two Modes, One Account. Switch instantly."
2. Storefront Button - "Your public profile. Share it anywhere."
3. Inventory Tab - "Manage all assets from one place."

**For Shopper Mode:**
1. Discovery Grid - "Start searching for your perfect asset."
2. Become Host Card - "Have idle equipment? Switch roles and earn."

---

## Phase 6: Enhanced HostOnboardingWizard

### Upgrade to "Corporate" Style

**Current:** Simple two-path cards (Rent vs Sell)
**Enhanced:**
- More professional terminology ("Rental Fleet" vs "Asset Sales")
- Feature bullets for each path
- Better visual hierarchy

```text
┌─────────────────────────────────────────────────────────────────────┐
│  Set up your Vendor Profile                                        │
│  "Welcome to the professional side of Vendibook."                  │
├────────────────────────────────┬────────────────────────────────────┤
│  📅 RENTAL FLEET               │  💰 ASSET SALES                    │
│                                │                                    │
│  Generate recurring revenue    │  List equipment for sale to       │
│  from trucks, trailers, or     │  thousands of verified buyers.    │
│  kitchens.                     │                                    │
│                                │                                    │
│  ✓ Recurring revenue tools     │  ✓ Escrow payment protection      │
│  ✓ Availability calendar       │  ✓ Verified buyer network         │
│  ✓ Automated contracts         │  ✓ Nationwide freight             │
│                                │                                    │
│  [Start Rental Business]       │  [List Item for Sale]             │
└────────────────────────────────┴────────────────────────────────────┘
```

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/home/HeroRentalSearch.tsx` | Create | Immersive rental-first hero with search pill |
| `src/components/home/RentalBenefits.tsx` | Create | "Why Rent?" value proposition section |
| `src/components/home/BecomeHostSection.tsx` | Create | Dark-themed host acquisition CTA (replace SupplySection) |
| `src/components/layout/ActiveLink.tsx` | Create | Reusable link with active state detection |
| `src/components/onboarding/DashboardOnboarding.tsx` | Create | Spotlight tour component |
| `src/pages/Index.tsx` | Modify | New section order, replace hero |
| `src/components/layout/Header.tsx` | Modify | Backdrop blur, center nav, user pill |
| `src/components/layout/MobileMenu.tsx` | Modify | Full-screen cinema experience |
| `src/pages/Dashboard.tsx` | Modify | Add element IDs, mount onboarding |
| `src/components/dashboard/HostDashboard.tsx` | Modify | Add `id="storefront-button"` |
| `src/components/dashboard/HostOnboardingWizard.tsx` | Modify | Corporate upgrade with feature bullets |
| `src/components/home/ListingsSections.tsx` | Modify | Prioritize rentals over sales |

---

## Visual Summary

### Before (Homepage)
```text
┌──────────────────────────────────────────────────────────────┐
│ Header                                                        │
│ HeroWalkthrough (Buy or Rent carousel)                       │
│ ListingsSections (Sale first, Rent second)                   │
│ PaymentsBanner                                                │
│ SupplySection (Generic sell/rent)                            │
│ CategoryCarousels                                             │
│ FinalCTA                                                      │
│ Footer                                                        │
└──────────────────────────────────────────────────────────────┘
```

### After (Homepage)
```text
┌──────────────────────────────────────────────────────────────┐
│ Header (Glass, Tab Nav)                                       │
│ HeroRentalSearch (Full-screen, "Don't buy. Rent.")           │
│ RentalBenefits (Why Rent? 3 columns)                         │
│ ListingsSections (Rent first, Sale second)                   │
│ PaymentsBanner                                                │
│ BecomeHostSection (Dark, Host acquisition)                   │
│ FinalCTA                                                      │
│ Footer                                                        │
└──────────────────────────────────────────────────────────────┘
```

---

## Implementation Order

1. **Create new components** (HeroRentalSearch, RentalBenefits, BecomeHostSection, ActiveLink, DashboardOnboarding)
2. **Update Index.tsx** with new section order
3. **Enhance Header.tsx** (backdrop blur, center nav, user pill)
4. **Transform MobileMenu.tsx** (cinema experience)
5. **Wire up Dashboard onboarding** (add IDs, mount tour)
6. **Upgrade HostOnboardingWizard.tsx** (corporate style)
7. **Update ListingsSections.tsx** (rentals first)

---

## Dependencies

All required packages are already installed:
- `framer-motion` - Animations
- `react-day-picker` + `date-fns` - Date picker in search pill
- `lucide-react` - Icons
- Existing `Calendar` component - Date selection

