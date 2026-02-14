

# Dynamic Share Kit Modal for Host Dashboard Listings

## Overview
Add a "Share" button to each listing card on the host dashboard that opens a polished, Airbnb-style modal populated with that listing's real data. The modal consolidates link sharing, auto-generated captions, social quick-share buttons, QR code generation, a mini listing preview, and a psychology nudge -- all in one place.

## What Gets Built

### 1. New Component: `ShareKitModal`
A new `src/components/dashboard/ShareKitModal.tsx` component that receives a listing object and renders inside a Radix Dialog (existing `Dialog` component from the UI library).

**Sections inside the modal (top to bottom):**

- **Header**: "Promote Your Listing" title + "Get more bookings and visibility by sharing your listing." subtitle
- **Share Link**: Pretty URL (`vendibook.com/share/listing/{id}`) displayed in a mono-font box with "Copy Link" and "Open Listing" buttons
- **Auto-Generated Caption**: Dynamic text based on listing mode:
  - Rent: Emoji + "Now Booking in {City, State}" + title + price/day + booking link
  - Sale: Emoji + "Food Truck for Sale in {City, State}" + title + price + link
  - Buttons: "Copy Caption" and "Copy Caption + Link"
- **Quick Share Buttons**: Facebook, LinkedIn, X (Twitter), and SMS -- each opens the native share intent URL in a new tab. Uses existing SVG icon patterns from `BuiltInShareKit.tsx`
- **QR Code**: Generated dynamically using the existing `qrcode` package (already installed). Shows QR image inline with a "Download QR" button and helper text
- **Listing Preview Card**: Mini card showing cover image thumbnail, title, city/state, price, and Instant Book badge if enabled
- **Psychology Boost**: Bottom banner with "Listings shared within the first 24 hours get significantly more visibility." and a "Copy Everything and Close" CTA that copies caption + link and closes the modal
- **UTM Toggle** (optional): Appends `?utm_source=host_share&utm_medium=dashboard&utm_campaign=listing_{id}` to the share URL when enabled

### 2. Modify: `HostListingCard`
Add a "Share" button (using the `Share2` icon from lucide-react) in the actions row, positioned after the "Edit" button and before the "Availability"/"Boost" buttons. Clicking it opens `ShareKitModal` with the listing data. The button only shows for published listings.

### 3. Data Flow
The modal receives the full listing object (already available in `HostListingCard` as `Tables<'listings'>`). It extracts:
- `title`, `mode`, `category`
- `city`, `state` (new columns from the recent migration)
- `price_daily`, `price_weekly`, `price_sale`
- `instant_book`
- `cover_image_url`
- `id`

No additional database queries needed.

### 4. Analytics Tracking
Uses the existing `trackEventToDb` function to log:
- `share_kit_opened` -- when modal opens
- `share_link_copied` -- copy link click
- `share_caption_copied` -- copy caption click
- `share_qr_downloaded` -- QR download
- `share_social_click` -- with `{ platform }` metadata
- `share_everything_copied` -- "Copy Everything" CTA

---

## Technical Details

### Files to Create
- `src/components/dashboard/ShareKitModal.tsx` -- the full modal component

### Files to Modify
- `src/components/dashboard/HostListingCard.tsx` -- add Share button + state for modal open/close, import `ShareKitModal`

### Existing Patterns Reused
- `Dialog` / `DialogContent` / `DialogHeader` from `@/components/ui/dialog` for the modal shell
- `QRCode.toDataURL()` from the `qrcode` package (same pattern as `ShareKit.tsx`)
- Social icon SVGs from `BuiltInShareKit.tsx` (TikTok, Instagram, Facebook, X) plus adding LinkedIn and SMS
- `trackEventToDb` from `@/hooks/useAnalyticsEvents`
- Pretty share URL format: `https://vendibook.com/share/listing/{id}` (already routed in App.tsx)
- Button styling: `h-9 rounded-xl` to match existing action buttons
- Vendibook orange accent (`#FF5124`) for primary CTAs

### No New Dependencies
Everything needed is already installed (`qrcode`, `@radix-ui/react-dialog`, `lucide-react`, `framer-motion`).

