
# Featured Listings, Search & Dashboard Improvements

Good news from the audit — a lot of the foundation already exists. The plan reuses existing pieces wherever possible and only adds what's truly missing.

---

## What already exists (will be reused, not rebuilt)

- **Featured columns** on `listings`: `featured_enabled`, `featured_at`, `featured_expires_at`, `pending_featured_payment` (JSONB ledger).
- **Stripe purchase flow**: `create-featured-checkout` + `stripe-webhook` handle activation, idempotency, refunds.
- **Admin email alerts** for featured purchases are already wired via the `featured-payment-admin-alert` transactional template (sent from `stripe-webhook`). We'll verify delivery and add a parallel in-app channel.
- **Search ranking**: `search-listings` edge function already sorts featured first across every sort mode and supports a `featured_only` filter — just not exposed in the UI.
- **Homepage featured row**: `src/components/home/FeaturedListings.tsx` exists but is only used on the alternate `Homepage2.tsx`, never mounted on the live `Index.tsx`.
- **Featured helper**: `src/lib/featured.ts → isListingFeatured()` correctly checks `featured_enabled` AND non-expired `featured_expires_at`.

---

## 1. Premium Featured Badge (replaces tiny star)

- New shared component `src/components/listing/FeaturedBadge.tsx`:
  - Gradient gold→amber pill with a soft outer glow and a subtle shimmer sweep (matches Satin Lux "glass CTA" memory).
  - `Crown` icon (lucide-react) + label "Featured".
  - Variants: `card` (compact pill, top-left corner), `detail` (larger ribbon for listing page hero), `row` (inline for the homepage featured row).
- Replace the current `Star` in `ListingCard.tsx` (lines 250–259) and add it to:
  - Listing detail hero (`ListingDetail.tsx`, near title block)
  - Search result cards (already use `ListingCard`)
  - Homepage featured row cards
- Comp/admin-granted featured shows the same badge — there is no visible distinction (per the request, paid vs comp should look identical to users).

## 2. Homepage "Featured Listings" Section

- Mount a new lightweight `HomepageFeaturedRow` near the top of `src/pages/Index.tsx` (right after `AnnouncementBanner`, before `ListingsSections`).
- Queries `listings` where `featured_enabled = true AND featured_expires_at > now() AND status = 'published'`, ordered by `featured_at desc`, limit 12.
- Horizontal scroll on mobile, premium grid on desktop.
- If 0 active featured → section hidden entirely (no awkward empty state).
- If 1–3 featured → still renders cleanly (left-aligned, no stretched empty slots).
- We will NOT auto-promote random listings into this slot — instead the admin tool in (5) fills the row with real comp-featured entries so users never see anything mislabeled.

## 3. Featured-First Ranking Everywhere

`search-listings` already does this. Extend the same featured-first ordering to the spots that bypass it today:
- `src/components/home/ListingsSections.tsx` — add a secondary client-side sort using `isListingFeatured` before rendering each row.
- `src/pages/Browse.tsx` and `src/pages/CategoryCityPage.tsx` — same treatment.
- Confirmed: expired featured listings are filtered by the helper, so this is automatic.

## 4. Featured Filter + Sort in UI

- **Filter**: add "Featured listings only" toggle to `src/components/search/FilterPanel.tsx`; wire to existing `featured_only` param on `search-listings`; sync to URL query (`featured=1`).
- **Sort**: add "Featured first" option to the sort dropdown in `src/pages/Search.tsx`. Since featured-first is already the implicit primary key in every mode, this option will simply pin "newest" as the secondary order and make the behavior explicit/discoverable.

## 5. Admin Notifications for Boost/Featured Purchases

Two-channel fix:
- **Email path** — already exists, but we'll:
  - Add a `console.log` + `email_send_log` assertion in `stripe-webhook` so we can confirm whether the `featured-payment-admin-alert` template actually fired for recent purchases.
  - Verify the admin recipient list and that the template is registered (it is).
- **In-app/admin dashboard path** — extend `send-admin-notification` with a new `type: 'featured_purchase'` (subject: "Featured listing purchased"), then call it from `stripe-webhook` alongside the existing email. Payload: listing title, listing URL, host name + email, amount, package, start/end dates, Stripe payment intent ID.
- Idempotency: the webhook already checks `pending_featured_payment.session_id` before activating; we'll reuse that guard to skip the admin notification on retries.

## 6. Complimentary Featured (Comp/Admin/Promo source)

Migration adds:
- `listings.featured_source TEXT` — values: `'paid' | 'comp' | 'admin' | 'promo'` (nullable; existing paid listings stay null/`paid`).
- Backfill: rows where `pending_featured_payment->>'source'` exists get `featured_source = 'paid'`.

New admin RPC `admin_grant_complimentary_featured(p_listing_id uuid, p_days int default 30)`:
- Security definer, `is_admin(auth.uid())` check.
- Sets `featured_enabled = true`, `featured_at = now()`, `featured_expires_at = now() + p_days days`, `featured_source = 'comp'`.
- Logs an entry into `admin_notes` for traceability.

Admin UI: small "Grant complimentary featured (30d)" button on the admin listings table (`src/pages/AdminListings.tsx`).

We are **not** auto-promoting random listings into the featured row — the request explicitly warns against mislabeling, and comp-featured fills any inventory gaps cleanly.

## 7. Favorites → Dashboard Crash Fix

Audit didn't find a definitive throw; likely causes:
- `useFavorites` returning `undefined` during auth hydration when navigating back.
- `Favorites.tsx` second query lacks a `!!user` guard.

Fixes:
- Add `enabled: !!user && favorites.length > 0` and a stable `queryKey` including `user?.id` on the listings fetch.
- Add safe fallbacks (empty array defaults, optional chaining on `listing.images`).
- Wrap the Favorites and Dashboard routes in an `ErrorBoundary` with a friendly "Something went wrong — back to dashboard" fallback (matches existing global ErrorBoundary memory).
- Add an empty state to `Favorites.tsx` when the list is empty.

## 8. Remove Map from Listing Detail

In `src/pages/ListingDetail.tsx` (~lines 730–752):
- Delete the `<ListingLocationMap />` render and its wrapping dividers.
- Keep the city/state text + `MapPin` line.
- Remove the now-unused `ListingLocationMap` import.
- Leaves no visual gap (the surrounding sections close up naturally).

## 9. Technical Details

**Migration (single file):**
```sql
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS featured_source TEXT;

UPDATE public.listings
  SET featured_source = 'paid'
  WHERE featured_enabled = true
    AND pending_featured_payment IS NOT NULL
    AND featured_source IS NULL;

CREATE OR REPLACE FUNCTION public.admin_grant_complimentary_featured(
  p_listing_id uuid, p_days int DEFAULT 30
) RETURNS public.listings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.listings;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE public.listings SET
    featured_enabled = true,
    featured_at = now(),
    featured_expires_at = now() + (p_days || ' days')::interval,
    featured_source = 'comp'
  WHERE id = p_listing_id
  RETURNING * INTO v_row;
  RETURN v_row;
END $$;
```

**Edge function changes:**
- `stripe-webhook` → after successful featured activation, `fetch('/functions/v1/send-admin-notification', { type: 'featured_purchase', data: {...} })`.
- `send-admin-notification` → add `featured_purchase` to the type union + subject map.

**Frontend new/changed files:**
- New: `src/components/listing/FeaturedBadge.tsx`, `src/components/home/HomepageFeaturedRow.tsx`.
- Edit: `ListingCard.tsx`, `ListingDetail.tsx`, `Index.tsx`, `ListingsSections.tsx`, `Browse.tsx`, `CategoryCityPage.tsx`, `Search.tsx`, `FilterPanel.tsx`, `Favorites.tsx`, `useFavorites.ts`, `AdminListings.tsx`.

## 10. QA after build

I'll verify each of your 12 checklist items in the preview and report back.

---

## Questions before I start

1. **Featured badge color** — gold/amber gradient (premium feel) vs the brand orange (#F97316)? Gold reads "premium" more clearly; orange keeps strict brand consistency. Lean: **gold accent** since orange is reserved for CTAs in the design system.
2. **Homepage featured row position** — directly under the hero/announcement (most prominent) or after the first "Recently Added for Rent" row (less pushy)? Lean: **directly under**, since that's what you asked for.
3. **Comp-featured admin UI** — quick button on the existing admin listings table is fastest; a dedicated "Featured manager" page with bulk controls is nicer but more work. Lean: **button now**, dedicated page later if you want.

If those defaults are fine, just say "go" and I'll execute the whole plan in one pass.
