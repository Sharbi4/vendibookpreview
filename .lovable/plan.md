

# Public Profile "Micro-Storefront" Enhancement Plan

## Overview

Transform the public profile page from a simple "User Page" into a fully-fledged "Micro-Storefront" optimized for trust and conversion, following Airbnb/Amazon marketplace standards.

---

## Current State Analysis

The profile page (`PublicProfile.tsx`) already has solid foundations:
- Response time badge (via `useHostResponseTime`)
- Identity verified badge with visual indicator
- Mobile sticky CTA (lines 386-410)
- Featured listings section (newest 3 items)
- Category filter chips
- Review stats and ratings

**What's Missing:**
1. "Superhost" / Top Rated badge for high-performing hosts
2. Shop Policies section (delivery, returns, cancellation)
3. About/Bio section with storytelling prompts
4. "Sold" section to demonstrate activity
5. Contextual message pre-fill from listing context
6. Pinned/Featured listing (host-controlled)

---

## Phase 1: Enhanced Trust Signals

### 1.1 "Top Rated" Badge

**Logic**: Award badge if host meets criteria:
- Average rating >= 4.8
- At least 5 reviews
- Response time < 2 hours (already tracked as `isFastResponder`)
- At least 3 completed bookings

**Implementation:**
- Create new hook `useHostBadges.ts` to calculate badge eligibility
- Add "Top Rated Vendor" or "Superhost" badge to `EnhancedPublicProfileHeader.tsx`
- Gold gradient styling similar to verified badge

### 1.2 Reviews Summary Enhancement

**Current**: Shows star rating and count
**Enhancement**: Add highlight of top strength based on review keywords

**Implementation:**
- Analyze reviews for common positive keywords (communication, equipment, cleanliness)
- Display: "4.9 (12 reviews) - Highly rated for communication"

---

## Phase 2: Shop Policies Section

### 2.1 Database Schema Addition

Add new columns to `profiles` table:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shop_policies JSONB DEFAULT '{}'::jsonb;
```

The `shop_policies` JSONB structure:
```json
{
  "delivery_range_miles": 50,
  "return_policy": "7-day returns on sales",
  "cancellation_notice": "24 hours",
  "accepts_deposits": true,
  "custom_policies": ["Local pickup available", "Insurance required"]
}
```

### 2.2 New Component: `ShopPoliciesCard.tsx`

Create a compact, expandable card showing:
- Delivery/Service area (derived from listings or manual setting)
- Cancellation policy summary
- Return policy (for sales)
- Custom vendor terms

**Location**: Below the stats row, above the tabs

---

## Phase 3: About/Bio Section with Storytelling

### 3.1 Bio Field Addition

**Database**: Add `bio` TEXT column to profiles table

### 3.2 UI Enhancement in `EnhancedPublicProfileHeader.tsx`

Add collapsible "About" section:
```text
"I've been in the food truck industry for 8 years. Started with a taco cart 
and now manage 3 trucks. My favorite thing about hosting is..."
```

**For hosts with empty bio**: Show prompt "This host hasn't added a bio yet"

**For own profile**: Show "Add your story" CTA linking to account settings

---

## Phase 4: "Sold" Section for Social Proof

### 4.1 Fetch Sold Items

Query listings where `status = 'sold'` for the host.

### 4.2 UI in `ProfileListingsTab.tsx`

After active listings, add a collapsed "Recently Sold" section:
- Visually distinct (muted/grayscale cards)
- "Sold" badge overlay
- Max 6 items shown
- Demonstrates marketplace activity and builds trust

---

## Phase 5: Contextual Message Pre-fill

### 5.1 Current Behavior (lines 212-221 in PublicProfile.tsx)

The `listingContext` is already captured from URL params (`?from_listing=...`)

### 5.2 Enhancement

When opening a conversation:
- Pass listing context to the messages page
- Pre-fill message input with: "Hi! I'm interested in [Listing Title]..."

**Implementation:**
- Modify `handleMessageHost` to pass listing details to navigation state
- Update Messages page to read prefill from state

---

## Phase 6: Host-Pinned Featured Listing

### 6.1 Database Addition

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pinned_listing_id UUID REFERENCES listings(id);
```

### 6.2 UI in `ProfileListingsTab.tsx`

**Current**: Shows newest 3 listings as "Featured"
**New**: If `pinned_listing_id` is set, show that listing first with a special "Pinned" badge

**Host Dashboard Integration:**
- Add "Pin to Profile" action in listing card dropdown
- Only one listing can be pinned at a time

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useHostBadges.ts` | Create | Calculate "Top Rated" eligibility |
| `src/components/profile/ShopPoliciesCard.tsx` | Create | Display vendor policies |
| `src/components/profile/AboutSection.tsx` | Create | Bio with storytelling |
| `src/components/profile/SoldListingsSection.tsx` | Create | Social proof section |
| `src/components/profile/EnhancedPublicProfileHeader.tsx` | Modify | Add Top Rated badge, bio section |
| `src/components/profile/ProfileListingsTab.tsx` | Modify | Add Sold section, pinned listing logic |
| `src/components/profile/EnhancedPublicProfileTabs.tsx` | Modify | Add Policies tab or inline section |
| `src/pages/PublicProfile.tsx` | Modify | Integrate new sections, fetch policies |
| `src/hooks/useUserProfile.ts` | Modify | Fetch bio and shop_policies |
| Database migration | Create | Add `bio`, `shop_policies`, `pinned_listing_id` columns |

---

## Implementation Order

1. **Database Migration** - Add new profile columns
2. **useHostBadges Hook** - Calculate Top Rated status
3. **ShopPoliciesCard** - Display vendor terms
4. **AboutSection** - Bio with prompts
5. **SoldListingsSection** - Social proof
6. **Pinned Listing** - Host-controlled featured item
7. **Message Pre-fill** - Contextual inquiry enhancement
8. **Account Settings** - UI to edit bio and policies

---

## Visual Mockup

```text
┌─────────────────────────────────────────────────────────────┐
│ HEADER                                                      │
│ ┌──────┐  "John's Mobile Kitchens"                         │
│ │Avatar│  📍 Los Angeles, CA                               │
│ │  ✓   │  [Verified] [Top Rated ⭐] [~1hr response]        │
│ └──────┘                                                    │
│          "I've been in the food truck industry for 8 years. │
│           My favorite part is seeing new entrepreneurs..."  │
│          [Read more]                                        │
│                                                             │
│          [Message Host] [View Listings (5)]                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STATS ROW                                                   │
│  [5 Listings] [4.9★ 12 reviews] [28 Booked]                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ SHOP POLICIES (Collapsible)                                 │
│ 📦 Delivery within 50 miles  |  ↩️ 7-day returns           │
│ ⏰ 24hr cancellation notice  |  💳 Deposits accepted       │
│ [View full policies]                                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ TABS: [Listings (5)] [Reviews (12)]                        │
├─────────────────────────────────────────────────────────────┤
│ 📌 PINNED LISTING                                          │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Featured Taco Truck - $45,000                          ││
│ │ "My best-seller, fully equipped"                       ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ALL LISTINGS                                                │
│ [Card 1] [Card 2] [Card 3]                                 │
│                                                             │
│ RECENTLY SOLD (Collapsed)                                   │
│ [Sold Card 1] [Sold Card 2] [Sold Card 3]                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ MOBILE STICKY CTA (Bottom)                                  │
│ [Message about listing] [View Listings (5)]                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Notes

### Top Rated Badge Criteria

```typescript
const isTopRated = useMemo(() => {
  return (
    stats?.averageRating >= 4.8 &&
    stats?.totalReviewsReceived >= 5 &&
    responseTimeData?.isFastResponder &&
    completedBookings >= 3
  );
}, [stats, responseTimeData, completedBookings]);
```

### Shop Policies JSONB Query

```typescript
const { data } = await supabase
  .from('profiles')
  .select('bio, shop_policies, pinned_listing_id')
  .eq('id', hostId)
  .single();
```

### Sold Listings Query

```typescript
const { data: soldListings } = await supabase
  .from('listings')
  .select('*')
  .eq('host_id', hostId)
  .eq('status', 'sold')
  .order('updated_at', { ascending: false })
  .limit(6);
```

