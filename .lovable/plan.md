

# SmartConciergeModal -- Behavior-Based Lead Capture

## Overview
Build a timed concierge modal that appears after 24 seconds of browsing. It uses a micro-commitment pattern (Rent/Host/Sell segmentation first, then data capture) and saves leads to the existing `asset_requests` table. Includes a polished success state with confetti, dynamic confirmation copy, and auto-close.

## How It Works

**Trigger**: After 24 seconds on the homepage, the modal fades in -- but only if the user hasn't dismissed it before (tracked via `localStorage`).

**Step 1 -- Segmentation (The Hook)**
- Headline: "How can we help you today?"
- Three vertical buttons: "I want to Rent", "I want to Host", "I want to Sell"
- Clicking one advances to Step 2 with conditional fields

**Step 2 -- Data Capture (Conditional)**
- **Rent path**: Zip Code, Monthly Budget (dropdown: Under $500 / $500-$1,000 / $1,000-$2,500 / $2,500+), Full Name, Email
- **Host path**: Address, Full Name, Email
- **Sell path**: What are you selling? (text), Full Name, Email

**Step 3 -- Success State**
- Animated green checkmark + confetti burst
- Dynamic copy based on path (e.g., "Our team is now manually scouting [Zip Code] for spaces within your [Budget] budget")
- "You have been assigned to a dedicated agent. No bots here."
- "Back to Browsing" button + "Chat now on WhatsApp" link
- Auto-closes after 5 seconds if user doesn't interact

## Data Storage
Submissions save to the existing `asset_requests` table. The table already has fields for email, city/state (zip code maps here), asset_type, budget_min/budget_max, and notes -- a perfect fit. No database migration needed.

- **Rent**: `asset_type` = "rental", zip code in `city`, budget range parsed into `budget_min`/`budget_max`
- **Host**: `asset_type` = "hosting", address in `notes`
- **Sell**: `asset_type` = "sale", item description in `notes`

An admin notification is also fired (via existing `send-admin-notification` edge function) so your team knows immediately.

## Data Integrity
All existing data collection remains untouched. This modal is additive -- it creates a new lead capture channel that feeds into the same `asset_requests` pipeline your admin dashboard already monitors under the "Concierge" tab.

## Interaction with Existing Popups
The `NewsletterPopup` fires at 5 seconds. This modal fires at 24 seconds. To avoid stacking, if the newsletter popup is still visible, the concierge modal will wait or skip. The `localStorage` key `smart_concierge_dismissed` prevents repeat appearances.

## Technical Details

### New file
- `src/components/home/SmartConciergeModal.tsx` -- Self-contained component with all 3 steps, form validation (zod), submission logic, confetti via `canvas-confetti`, and localStorage persistence

### Modified files
- `src/pages/Index.tsx` -- Import and render `SmartConciergeModal` alongside existing components

### Styling
- Apple/Turo aesthetic: white background, `rounded-2xl`, subtle `border-gray-200`
- Backdrop: `backdrop-blur-sm bg-black/40`
- Compact size: `max-w-sm`
- Smooth entry animation via framer-motion (fade + scale)
- Action buttons: full-width, `bg-black text-white`, `rounded-lg`
- Inputs: `h-10`, `border-gray-200`, `focus:ring-blue-500`

