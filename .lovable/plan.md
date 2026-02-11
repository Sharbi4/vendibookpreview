

# Homepage 2 -- Search-First Discovery Experience

## Overview
A new alternate homepage at `/homepage2` inspired by OpenAI, Turo, and Apple -- an app-like, search-first experience with a bold gradient hero, glassmorphism filter panels, a sticky Google Map, paginated 2x2 listing results, and polished empty states with animations.

## Visual Design

- **Hero gradient**: 3-color sweep -- `#FF5124` (Vendibook orange) through `#E64A19` (deep amber) to `#FFB800` (warm gold)
- **Glassmorphism**: All filter bars, cards, and modules use `backdrop-blur-xl bg-white/70 border border-white/20 shadow-xl`
- **Typography**: Large, tight-tracked headlines (Apple style); system font stack
- **Buttons**: Dark-shine CTAs consistent with existing design system
- **Motion**: Framer Motion staggered card entrances, hover lifts, and a floating empty-state animation

## Page Layout

```text
+----------------------------------------------------------+
|  HEADER (existing sticky header)                         |
+----------------------------------------------------------+
|  GRADIENT HERO BAR                                       |
|  "Discover Food Business Assets"                         |
|  [ Location ] [ Category v ] [ Rent | Sale ] [ Search ] |
+----------------------------------------------------------+
|  GLASS FILTER BAR                                        |
|  [Chips: All | Food Truck | Trailer | Kitchen | ...]     |
|  Sort: Newest v          Showing X results               |
+----------------------------------------------------------+
|  LEFT (60%)                |  RIGHT (40%)                |
|  -------------------------  | -------------------------   |
|  Card  |  Card             |  Google Map (sticky)        |
|  ------|------             |  with price markers         |
|  Card  |  Card             |                             |
|  ------|------             |                             |
|  Card  |  Card             |                             |
|  -------------------------  |                             |
|  < 1 2 3 ... 10 >         |                             |
|  -------------------------  |                             |
|  "Learn More" Glass Card  |                             |
+----------------------------------------------------------+
|  FOOTER                                                  |
+----------------------------------------------------------+
```

On mobile: map hides behind a "Show Map" toggle; grid becomes single column.

## Key Sections

### 1. Gradient Hero with Inline Search
- Full-width gradient bar with animated shine sweep
- Bold headline with text shadow for depth
- Inline search row: location autocomplete (reusing `LocationSearchInput`), category dropdown, mode toggle (Rent/Sale/All), and a dark-shine search button
- Subtle floating decorative orbs in the background

### 2. Glassmorphism Filter & Sort Bar
- Sticky below header on scroll
- Category filter chips (rounded-full, glass bg, orange gradient when active)
- Sort dropdown (Newest, Price Low-High, Price High-Low, Nearest)
- Result count indicator

### 3. Listings Grid (Left Panel)
- 2-column grid on desktop, 1-column on mobile
- 20 results per page using existing `search-listings` edge function
- Reuses existing `ListingCard` component
- Framer Motion staggered entrance animations
- Cards have hover lift effect (y: -4)

### 4. Google Map (Right Panel)
- Sticky positioning (`sticky top-24`)
- Reuses existing `SearchResultsMap` component with price markers
- Shows markers for current page listings only
- User location circle when geolocation is active
- Glass-morphism border treatment

### 5. Empty State
- When no results: centered glass container with animated gradient orbs
- Floating food truck icon (CSS keyframe bob animation)
- Friendly copy: "No listings found here yet" with suggestions
- CTA to clear filters or browse all

### 6. "Learn More" Module
- Glass-premium card at bottom of left panel
- 3-step icon summary of how Vendibook works
- "Learn More" dark-shine button linking to `/how-it-works`

## Technical Details

### New File
**`src/pages/Homepage2.tsx`** -- Single page component containing:
- State management via `useState` for filters (query, category, mode, sort, page, lat/lng)
- Calls `search-listings` edge function with `page_size: 20`
- Integrates `useGoogleMapsToken` for the map
- CSS grid layout: `grid-cols-1 lg:grid-cols-5` (3 cols left, 2 cols right)
- Map uses `sticky top-24` with `h-[calc(100vh-7rem)]`
- Pagination via existing `Pagination` UI components
- Page changes scroll to top of results

### Modified File
**`src/App.tsx`** -- Add lazy import and route:
- `const Homepage2 = lazy(() => import("./pages/Homepage2"));`
- `<Route path="/homepage2" element={<PageTransition><Homepage2 /></PageTransition>} />`

### Reused Components
- `Header` / `Footer` (layout)
- `LocationSearchInput` (location autocomplete with geolocation)
- `SearchResultsMap` (Google Map with price markers)
- `ListingCard` (listing display)
- `Pagination` components (page navigation)
- `useGoogleMapsToken` hook
- `search-listings` edge function (server-side search with all filters)

### Responsive Behavior
- **Desktop (lg+)**: Split layout with map; 2-column grid
- **Tablet (md)**: Map hidden by default with toggle; 2-column grid
- **Mobile**: Single column; map behind floating toggle button; compact filter chips with horizontal scroll

### Motion & Interactions
- Cards: staggered fade-in on mount (`initial={{ opacity: 0, y: 20 }}`), hover lift (`whileHover={{ y: -4 }}`)
- Filter chips: scale tap feedback (`whileTap={{ scale: 0.95 }}`)
- Hero: gradient shine sweep animation (CSS keyframe)
- Empty state: floating icon bob animation, pulsing gradient orbs
- Page transitions: fade via existing `PageTransition` wrapper
