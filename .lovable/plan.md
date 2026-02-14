

# Harden Listing Page Structured Data for Google Rich Results

## Current State

Your listing pages already have a solid foundation:
- Product + Offer schema with price, availability, images, SKU, and seller
- BreadcrumbList schema
- AggregateRating when reviews exist
- UnitPriceSpecification for rental pricing
- Keyword-rich SEO titles and meta descriptions

## What's Missing (and Why Listings Aren't Showing as Rich Results)

### 1. Product Name Isn't Search-Optimized
Currently: `"name": "Tampa Kitchen Hub"`
Should be: `"name": "Shared Kitchen for Rent in Tampa, FL - Tampa Kitchen Hub"`

Google uses the Product name to match search queries. If someone searches "shared kitchen for rent Tampa," your schema name needs to contain those words.

### 2. No LocalBusiness Schema for Physical Locations
Kitchens, vendor spaces, and food truck parks are physical places. Google expects LocalBusiness schema for these, not just Product. The fix: emit BOTH Product and LocalBusiness schemas for `ghost_kitchen` and `vendor_lot`/`vendor_space` categories.

### 3. H1 Tag Missing City Name
Currently: `<h1>Tampa Kitchen Hub</h1>`
Should be: `<h1>Tampa Kitchen Hub - Shared Kitchen for Rent in Tampa, FL</h1>`

Google weights the H1 heavily for ranking. Adding category + city to the H1 directly targets "shared kitchen for rent Tampa" queries.

### 4. Missing Product Meta Tags for Social / Shopping
Open Graph type is set to `website` instead of `product`. Adding `og:price:amount` and `og:price:currency` enables richer social previews and potential shopping integrations.

### 5. No FAQ Schema
Adding a small FAQ section to listings (auto-generated from listing attributes) gives Google another rich result opportunity, like:
- "Is this food truck available for rent?" -> "Yes, starting at $150/day"
- "Where is this located?" -> "Tampa, FL"

### 6. No `additionalProperty` for Specs
Google can display specs (dimensions, equipment) in product rich results. Currently the tech specs are visible on-page but invisible to the schema.

---

## Technical Changes

### File: `src/components/JsonLd.tsx`

**A. Update `generateProductSchema`:**
- Change `name` to include category label + mode + city: `"Food Truck for Rent in Tampa, FL - [Title]"`
- Add `additionalProperty` array from listing specs (length, width, weight) when available
- Accept new optional params: `length_inches`, `width_inches`, `weight_lbs`

**B. Add `generateListingLocalBusinessSchema`:**
- New function for ghost_kitchen / vendor_lot / vendor_space categories
- Includes `@type: LocalBusiness`, address, geo coordinates (if available), and `makesOffer` linking to the Product

**C. Add `generateListingFAQSchema`:**
- Auto-generates 3-5 Q&A pairs from listing data:
  - "Is this [category] available?" -> based on status
  - "How much does it cost?" -> based on pricing
  - "Where is it located?" -> based on address
  - "Can I book instantly?" -> based on instant_book flag
  - "Is delivery available?" -> based on fulfillment_type

### File: `src/pages/ListingDetail.tsx`

**A. Enrich H1:**
- Append ` - ${categoryLabel} ${modeLabel} in ${locationShort}` to the H1 when location is available

**B. Add LocalBusiness + FAQ schemas:**
- For physical location categories (ghost_kitchen, vendor_lot, vendor_space), generate and include the LocalBusiness schema alongside Product
- Generate and include FAQ schema for all listings

**C. Update SEO component call:**
- Change `type` from `"website"` to `"product"` (this maps to `og:type`)

### File: `src/components/SEO.tsx`

**A. Support `product` OG type:**
- Extend the `type` prop to accept `'product'`
- When type is `product`, also set `og:price:amount` and `og:price:currency` meta tags
- Add optional `price` and `priceCurrency` props to SEOProps

