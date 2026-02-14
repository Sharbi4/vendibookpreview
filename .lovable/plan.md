

# Programmatic SEO Engine for Vendibook

This plan addresses the full SEO playbook to get Vendibook listings ranking for searches like "food truck for rent near me" and "food truck rental Tampa."

## Overview

There are three major gaps to close:

1. **No category+city landing pages** matching how people actually search (e.g., `/rent/food-trucks/houston-tx/`)
2. **No dynamic sitemap** that includes every published listing
3. **No "Related Listings" section** on listing detail pages to boost internal linking

---

## 1. Programmatic Category + City + Mode Landing Pages

Create a new `CategoryCityPage` component that renders pages like:

```text
/rent/food-trucks/houston-tx/
/rent/food-trailers/phoenix-az/
/buy/food-trucks/dallas-tx/
/rent/commercial-kitchens/los-angeles-ca/
/rent/vendor-spaces/houston-tx/
```

Each page will:
- Fetch real listings from the database filtered by category, mode, and city
- Display an `ItemList` schema with up to 50 listings for Google indexing
- Include 150-250 words of unique, city-specific intro copy
- Show breadcrumbs: `Home > For Rent > Food Trucks > Houston, TX`
- Link to individual listings + related categories + the city hub page
- Have a keyword-optimized title like: `Food Trucks for Rent in Houston, TX | Vendibook`
- Have a keyword-optimized H1: `Food Trucks for Rent in Houston, TX`

**Route pattern:** Dynamic routes in App.tsx:
- `/rent/:categorySlug/:cityStateSlug`
- `/buy/:categorySlug/:cityStateSlug`

**City data expansion:** Add Tampa, Portland, Miami, Atlanta, Austin, San Antonio, Chicago to cityData.ts (with state codes for URL slugs like `tampa-fl`).

**Category slug map:**
- `food-trucks` -> `food_truck`
- `food-trailers` -> `food_trailer`
- `commercial-kitchens` -> `ghost_kitchen`
- `vendor-spaces` -> `vendor_lot`

---

## 2. Dynamic Listing Sitemap

Create a new edge function `generate-sitemap` that:
- Queries all published listings from the database
- Returns a valid XML sitemap with `<lastmod>` from `updated_at`
- Includes all programmatic category+city pages
- Returns proper `Content-Type: application/xml` header

Update `sitemap.xml` to become a sitemap index that references:
- `sitemap_pages.xml` (static pages, already defined)
- `sitemap_listings.xml` (from edge function)
- `sitemap_locations.xml` (programmatic city+category pages)

---

## 3. "Related Listings" Section on Listing Detail Pages

Add a section at the bottom of `ListingDetail.tsx` (above Footer) that:
- Queries 4-6 published listings matching the same category or city
- Excludes the current listing
- Displays as a horizontal card grid with title, image, price, location
- Each card links to the listing detail page
- Section title: `"Similar {Category} near {City}"`

This creates the internal linking web that helps Google discover every listing.

---

## 4. Listing Detail SEO Hardening

Small but impactful tweaks to the existing listing detail page:

- Add `"Ideal for..."` text to the meta description when specs data is available
- Add image `alt` text pattern: `"{Listing Title} - {Category} for {Mode} in {City}"`
- Ensure the H1 contains the city name (currently it only shows listing title)

---

## Technical Details

### New Files
- `src/pages/CategoryCityPage.tsx` -- The programmatic SEO landing page component
- `src/components/listing-detail/RelatedListings.tsx` -- Related listings section
- `supabase/functions/generate-sitemap/index.ts` -- Dynamic sitemap edge function

### Modified Files
- `src/App.tsx` -- Add routes for `/rent/:categorySlug/:cityStateSlug` and `/buy/:categorySlug/:cityStateSlug`
- `src/data/cityData.ts` -- Add Tampa, Portland, Miami, Atlanta, Austin, San Antonio, Chicago with state codes
- `src/pages/ListingDetail.tsx` -- Add RelatedListings section, refine H1 to include city
- `src/components/JsonLd.tsx` -- Add `generateCategoryCitySchema()` helper for the new pages
- `public/sitemap.xml` -- Convert to sitemap index pointing to sub-sitemaps
- `public/robots.txt` -- Update sitemap reference to sitemap index

### Database
No schema changes needed. All queries use existing `listings` table filtered by `status = 'published'`, `category`, `mode`, and `address ILIKE '%city%'`.

### Route Priority
The new `/rent/...` and `/buy/...` routes won't conflict with existing city routes (`/:citySlug`) because they have explicit prefixes.

