# Upgrade the Listing Share Kit

## What Already Exists

Your `ListingPublished` page and `ShareKit` component already have solid bones -- copy link, Facebook post variants, QR code, PDF flyer, and share image downloads. This plan enhances it with the missing pieces from your vision.

## What We'll Add

### 1. "Boost Your Visibility in 5 Minutes" Section Header

A new section title above the share tools with motivating copy, replacing the current minimal header.

### 2. "Add Your Link Everywhere" Checklist

An interactive checklist card with these items (users can check them off for satisfaction):

- Facebook bio
- Instagram bio
- Facebook Marketplace listing
- Google Business profile
- Linktree

Progress persists in localStorage per listing so hosts feel accomplishment.

### 3. Psychology Banner

A subtle but persuasive banner at the top:

> "Listings that share their link receive up to 3x more booking requests."

Styled with the signature gradient accent to draw attention without being obnoxious.

### 4. Category-Aware Default Caption

The existing post variant system already handles this well. We'll refine it so the default selected variant maps better to category:

- Kitchen categories default to "Short + Direct" with kitchen-specific language
- Food truck/trailer defaults to "Friendly + Story"
- Vendor lots default to "Seller-focused"

### 5. Bottom Action Buttons

Add an "Edit Listing" button alongside the existing "View listing" and "Add another listing" links.

## Technical Details

### Files Modified

`**src/components/listing-wizard/ShareKit.tsx**`

- Add the psychology banner as a gradient-accented card at the top of the component
- Add the "Add Your Link Everywhere" checklist card (new card between the header and copy-link card) with localStorage-backed checkbox state
- Update default variant selection logic to be category-aware (kitchen vs truck vs vendor)
- Add "Edit Listing" button to the bottom actions section
- Add "Boost Your Visibility in 5 Minutes" as a section title above the share tools

`**src/pages/ListingPublished.tsx**`

- No structural changes needed; the ShareKit component handles all the new content

### Design Approach

- All new elements follow the existing card-based layout pattern
- Checklist uses standard Radix checkbox components
- Psychology banner uses the signature gradient (`#FF5124` to `#FFB800`) at low opacity
- Mobile-first, no popups, large tap targets -- consistent with current UX