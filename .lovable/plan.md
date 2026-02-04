
# Homepage Optimization: Performance, UX & CLS Fixes

## Issues Summary

Based on analysis of `Index.tsx`, `ListingsSections.tsx`, `AnnouncementBanner.tsx`, `NewsletterPopup.tsx`, and `SEO.tsx`:

| Issue | Severity | Impact |
|-------|----------|--------|
| Data fetching waterfall (lazy load → then fetch) | High | Slow time-to-content |
| Aggressive verification redirect | Medium | Frustrating UX, navigation hijacking |
| CLS from images without dimensions | Medium | Poor Core Web Vitals score |
| Inline BNPL banner code | Low | Maintainability |
| SEO schema missing details | Low | Missed SERP features |

---

## Implementation Plan

### Phase 1: Fix the Verification Redirect (UX)

**Current Behavior (Problem)**:
```typescript
useEffect(() => {
  if (!isLoading && user && !isVerified) {
    // Hard redirect to /verify-identity
    navigate('/verify-identity');
  }
}, ...);
```

**New Behavior**:
- Replace redirect with a dismissible banner at the top of the page
- Banner shows only for logged-in, unverified users who haven't dismissed it
- Uses the existing `Alert` component with a CTA button

**New File**: `src/components/home/VerificationBanner.tsx`
```typescript
// Shows a non-blocking alert for unverified users
// "Verify your identity to unlock booking" + Verify Now button + Dismiss (X)
// Respects localStorage dismissal state
```

### Phase 2: Fix CLS (Image Dimensions)

**Problem**: Payment logos use CSS-only sizing without explicit `width` and `height`:
```tsx
<img src={affirmLogo} alt="Affirm" className="h-7 md:h-9" />
```

**Fix**: Add explicit `width` and `height` attributes to reserve space before load:
```tsx
<img 
  src={affirmLogo} 
  alt="Affirm" 
  width={80}      // Add explicit width
  height={28}     // Add explicit height
  className="h-7 md:h-9 w-auto object-contain" 
/>
```

**Files Affected**:
- `src/pages/Index.tsx` (BNPL logos)
- `src/components/home/AnnouncementBanner.tsx` (add min-height to container)

### Phase 3: Extract BNPL Banner Component

**Problem**: 35+ lines of inline JSX in `Index.tsx` for the payments banner makes the file messy.

**Solution**: Extract to `src/components/home/PaymentsBanner.tsx`

This component will:
- Contain all BNPL banner styling and content
- Import logos internally
- Include proper image dimensions (from Phase 2)
- Be simpler to test and modify independently

### Phase 4: Optimize Data Fetching (Eliminate Waterfall)

**Current Problem Flow**:
```text
1. Index.tsx renders
2. Suspense boundary starts loading ListingsSections chunk
3. ListingsSections mounts
4. useQuery starts fetching listings data  ← WATERFALL
5. Data arrives, component renders
```

**Optimized Flow**: Prefetch data in parallel with lazy component loading.

**Implementation**:
```typescript
// In Index.tsx - start fetching immediately, before lazy load completes
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Prefetch listings data at module level or in useEffect
const prefetchHomeListings = async (queryClient: QueryClient) => {
  await queryClient.prefetchQuery({
    queryKey: ['home-listings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(12);  // Only fetch what we display
      return data;
    },
    staleTime: 30000, // 30 seconds
  });
};
```

**Alternative Approach** (if prefetch is complex): Move the data fetching up to `Index.tsx` and pass data as props to `ListingsSections`, so data loads in parallel with the lazy chunk.

### Phase 5: Limit Listings Query

**Current**: Fetches ALL published listings
```typescript
.eq('status', 'published')
.order('published_at', { ascending: false });
// Returns potentially hundreds of rows
```

**Fix**: Add `.limit(12)` since we only display 6 sale + 6 rent max:
```typescript
.eq('status', 'published')
.order('published_at', { ascending: false })
.limit(12);  // Only need 12 for homepage display
```

### Phase 6: Reserve Space for AnnouncementBanner

**Problem**: If the banner loads asynchronously or text wraps differently, it can cause layout shift.

**Fix**: Add `min-height` to ensure consistent space reservation:
```tsx
<div className="w-full bg-muted border-b border-border py-2.5 px-4 min-h-[44px]">
```

This reserves ~44px (padding + line height) so content below doesn't jump.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Remove redirect useEffect, add VerificationBanner, replace inline BNPL with PaymentsBanner, add data prefetch |
| `src/components/home/VerificationBanner.tsx` | **New file** - dismissible verification prompt |
| `src/components/home/PaymentsBanner.tsx` | **New file** - extracted BNPL banner with proper image dimensions |
| `src/components/home/ListingsSections.tsx` | Add `.limit(12)` to query |
| `src/components/home/AnnouncementBanner.tsx` | Add `min-h-[44px]` class |

---

## Technical Details

### VerificationBanner Component Structure

```typescript
interface VerificationBannerProps {
  userId: string;
}

// Uses Alert component with:
// - ShieldCheck icon
// - "Verify your identity to unlock booking" message
// - "Verify Now" button (Link to /verify-identity)
// - Dismiss X button (sets localStorage flag)
```

### PaymentsBanner Component Structure

```typescript
// Self-contained component with:
// - affirm-logo.png import
// - afterpay-logo.jpg import  
// - Explicit width/height on images
// - "Now accepting flexible payments" messaging
// - "Learn more" CTA to /payments
```

### Data Prefetch Strategy

Using React Query's `prefetchQuery` allows the data fetch to start immediately when Index.tsx mounts, running in parallel with the lazy-loaded component chunk download. This eliminates the sequential waterfall.

---

## Benefits

| Improvement | Before | After |
|-------------|--------|-------|
| Verification UX | Hard redirect hijacks navigation | Dismissible banner, user stays on homepage |
| CLS Score | Images cause layout shift | Reserved dimensions, no shift |
| Time to Content | Sequential: load chunk → then fetch data | Parallel: chunk + data load together |
| Data Transfer | Fetches ALL listings | Fetches only 12 needed |
| Code Organization | 35+ lines inline JSX | Clean component extraction |

---

## SEO Schema Enhancement (Optional)

The current `generateOrganizationSchema` already includes `logo` and `sameAs` social links. The `generateWebSiteSchema` already includes `SearchAction`. These are correctly implemented - no changes needed.
