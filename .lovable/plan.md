
# Server-Side Search Refactor: Scalable Architecture

## Problem Summary

The current `Search.tsx` has **three critical scalability issues**:

1. **Full Table Download**: Fetches ALL published listings on page load (`SELECT * FROM listings WHERE status = 'published'`), then filters client-side with JavaScript and Fuse.js
2. **N+1 Query Waterfall**: After fetching listings, triggers separate queries for:
   - Host verification status (`get_host_verification_status` RPC)
   - Unavailable dates (blocked_dates + booking_requests)
3. **No Pagination**: All results render at once with no lazy loading

With 47 listings today, this is unnoticeable. At 500+ listings, the page will become slow. At 5,000+, it will be unusable.

---

## Solution Architecture

Move all filtering to the server via a new **unified search edge function** that:
- Accepts all filter parameters in a single request
- Performs location-based radius filtering server-side
- Joins host verification data inline
- Pre-computes availability based on date ranges
- Returns paginated, sorted results

```text
CURRENT FLOW (Client-side):
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Fetch ALL  │ -> │ Fetch Host  │ -> │ Filter with │
│  Listings   │    │  Profiles   │    │ JavaScript  │
│  (N rows)   │    │  (N+1)      │    │ Fuse.js     │
└─────────────┘    └─────────────┘    └─────────────┘

NEW FLOW (Server-side):
┌─────────────────────────────────────────────────────────┐
│  POST /functions/v1/search-listings                     │
│  ─────────────────────────────────────────────────────  │
│  • Receive filters: category, mode, location, dates,    │
│    radius, amenities, price, pagination                 │
│  • Apply filters in SQL                                 │
│  • Calculate distance using Haversine                   │
│  • Join profiles for host_verified                      │
│  • Check availability inline                            │
│  • Return paginated results + total count               │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Create Server-Side Search Edge Function

**File**: `supabase/functions/search-listings/index.ts`

The edge function will accept:
```typescript
interface SearchRequest {
  // Filters
  query?: string;          // Text search on title, description, address
  mode?: 'rent' | 'sale';  // Listing mode filter
  category?: string;       // Category filter
  latitude?: number;       // User location for radius
  longitude?: number;
  radius_miles?: number;   // Default 25
  
  // Date availability (for rentals)
  start_date?: string;     // YYYY-MM-DD
  end_date?: string;
  
  // Additional filters
  amenities?: string[];    // Required amenities
  min_price?: number;
  max_price?: number;
  instant_book_only?: boolean;
  verified_hosts_only?: boolean;
  delivery_capable?: boolean;
  
  // Pagination & sorting
  page?: number;           // Default 1
  page_size?: number;      // Default 20, max 50
  sort_by?: 'newest' | 'price_low' | 'price_high' | 'distance' | 'relevance';
}
```

Returns:
```typescript
interface SearchResponse {
  listings: Array<{
    ...listing,
    distance_miles?: number;
    host_verified: boolean;
    is_available: boolean;  // For rental date filtering
  }>;
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}
```

### Phase 2: Server-Side Filtering Logic

The edge function will:

1. **Text Search**: Use PostgreSQL `ILIKE` on title, description, address (Fuse.js removed)
2. **Location Filtering**: Apply Haversine distance calculation in JavaScript after fetching nearby candidates (bounding box optimization first)
3. **Date Availability**: Exclude listings with conflicts in `listing_blocked_dates` or `booking_requests`
4. **Joined Data**: Query `profiles.identity_verified` in the same response
5. **Pagination**: Use `.range(offset, offset + pageSize - 1)`

### Phase 3: Update `Search.tsx` to Use Edge Function

Replace the current client-side approach:

```typescript
// BEFORE (current)
const { data: listings } = useQuery({
  queryKey: ['search-listings'],
  queryFn: async () => {
    const { data } = await supabase
      .from('listings')
      .select('*')
      .eq('status', 'published');
    return data;
  },
});
// + Fuse.js filtering + multiple separate queries

// AFTER (new)
const { data: searchResults, isLoading } = useQuery({
  queryKey: ['search-listings', filters, page],
  queryFn: async () => {
    const { data, error } = await supabase.functions.invoke('search-listings', {
      body: {
        query: searchQuery,
        mode: mode !== 'all' ? mode : undefined,
        category: category !== 'all' ? category : undefined,
        latitude: locationCoords?.[1],
        longitude: locationCoords?.[0],
        radius_miles: searchRadius,
        start_date: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        end_date: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
        amenities: selectedAmenities.length > 0 ? selectedAmenities : undefined,
        min_price: priceRange[0] > 0 ? priceRange[0] : undefined,
        max_price: priceRange[1] !== Infinity ? priceRange[1] : undefined,
        instant_book_only: instantBookOnly || undefined,
        verified_hosts_only: verifiedHostsOnly || undefined,
        page,
        page_size: 20,
        sort_by: sortBy,
      }
    });
    return data;
  },
  keepPreviousData: true,  // Smooth pagination transitions
});
```

### Phase 4: Add Pagination UI

Add pagination controls at the bottom of results:

```typescript
// New component or inline
<Pagination>
  <PaginationContent>
    <PaginationItem>
      <PaginationPrevious 
        onClick={() => setPage(p => Math.max(1, p - 1))}
        disabled={page === 1}
      />
    </PaginationItem>
    {/* Page numbers */}
    <PaginationItem>
      <PaginationNext 
        onClick={() => setPage(p => p + 1)}
        disabled={page >= searchResults?.total_pages}
      />
    </PaginationItem>
  </PaginationContent>
</Pagination>
```

### Phase 5: Remove Client-Side Filtering Code

Delete from `Search.tsx`:
- `Fuse.js` import and setup (lines 3, 216-228)
- `filteredListings` useMemo (lines 307-412)
- Separate `hostProfiles` and `unavailableDates` queries (lines 143-213)
- Client-side distance calculation helpers (lines 243-304)

---

## Technical Details

### Edge Function SQL Strategy

**Bounding Box Optimization for Location**:
```sql
-- First narrow with bounding box (uses indexes)
WHERE latitude BETWEEN :lat - :delta AND :lat + :delta
  AND longitude BETWEEN :lng - :delta AND :lng + :delta
-- Then precise Haversine in JavaScript for final filtering
```

**Availability Check**:
```sql
-- Exclude listings with blocked dates in range
WHERE NOT EXISTS (
  SELECT 1 FROM listing_blocked_dates bd
  WHERE bd.listing_id = listings.id
    AND bd.blocked_date BETWEEN :start AND :end
)
-- Exclude listings with approved bookings in range
AND NOT EXISTS (
  SELECT 1 FROM booking_requests br
  WHERE br.listing_id = listings.id
    AND br.status = 'approved'
    AND br.start_date <= :end
    AND br.end_date >= :start
)
```

**Host Verification Join**:
```typescript
// In edge function, after fetching listings
const hostIds = [...new Set(listings.map(l => l.host_id).filter(Boolean))];
const { data: profiles } = await supabaseClient
  .from('profiles')
  .select('id, identity_verified')
  .in('id', hostIds);

// Merge into listings
listings.forEach(l => {
  l.host_verified = profiles.find(p => p.id === l.host_id)?.identity_verified ?? false;
});
```

### Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/search-listings/index.ts` | Create | New unified search edge function |
| `supabase/config.toml` | Modify | Add function configuration |
| `src/pages/Search.tsx` | Modify | Replace client queries with edge function call, add pagination |

### Config Update

```toml
[functions.search-listings]
verify_jwt = false
```

---

## Benefits

| Metric | Before | After |
|--------|--------|-------|
| Initial payload | ALL listings (N × ~2KB each) | 20 listings (~40KB) |
| Network requests | 3+ sequential | 1 |
| Client CPU | High (Fuse.js + filtering) | Minimal (render only) |
| Time to interactive | O(N) | O(1) |
| Works at 10,000 listings | No | Yes |

---

## Note on HowItWorks Gallery

The "Featured Assets Gallery" mentioned in your audit was **already removed** during the previous refactor. The HowItWorks page now uses the "Traffic Controller" pattern with role-based content (buyer vs. seller). No further changes needed there.
