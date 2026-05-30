
# Subtle Referral Surfacing — "Native, Not Gimmicky"

Goal: Surface the referral program in five contextual places, each minimal and on-brand. No floating buttons, no popups, no top-nav link, no confetti.

---

## 1. Dashboard sidebar — "Refer & Earn"

`src/components/layout/DashboardLayout.tsx`

- Add one nav item to both `host` and `shopper` navigation arrays, placed near the bottom (above Messages):
  - Title: **"Refer & Earn"**
  - Icon: `Gift` (single, minimal — no badge color)
  - Href: `/referral/dashboard`
- If the user has lifetime earnings > 0, render a tiny muted suffix `$X earned` to the right of the label using `text-xs text-muted-foreground`. Fetch once in `DashboardLayout` via a lightweight query against `referrals` (sum of `reward_amount` where `status='paid'` and `referrer_id = user.id`).
- No pulse, no color accent — matches existing nav typography exactly.

## 2. Post-transaction success screen — earned moment

`src/pages/PaymentSuccess.tsx`

- After the existing confirmation block, add a single hairline-bordered card (matches Satin Lux glass card spec) at the very bottom of the content column:
  - Headline: *"Enjoying Vendibook? Know someone else who'd benefit?"*
  - One ghost/outline button: **"See how referring works"** → `/referral`
- No dollar amount in copy. No emoji. Only renders when transaction status is success (already the page condition).

## 3. Listing detail — contextual share line

`src/pages/ListingDetail.tsx` (near the existing share button area, ~line 80)

- Below the share button, for **logged-in users who are not the listing owner**, render one line:
  - *"Share this listing and earn if they buy."* → links to `/referral`
- Styled as `text-xs text-muted-foreground`, underlined on hover only.
- Hidden when `!user` or `user.id === listing.host_id`.

## 4. Footer link — discoverable, not pushy

`src/components/layout/Footer.tsx`

- Add one entry to the existing **"List & Earn"** section (line 37):
  - `{ label: 'Refer & Earn', href: '/referral' }`
- No new section, no separate column. Sits naturally with existing earn-related links.

## 5. Bottom-of-search contextual strip

`src/pages/Browse.tsx` (or `Search.tsx`, whichever renders the listings grid footer)

- After the results grid, before pagination/footer, render one thin centered line:
  - *"Know someone with a food truck to sell? You could earn up to $150."*
  - Subtle link styling, max-width container, `text-sm text-muted-foreground` with a hover underline → `/referral`
- Only renders when there are ≥ 1 search results (i.e., user is actively browsing, not on an empty state).

---

## Explicitly NOT doing

- No homepage hero, no sticky floating button, no first-visit modal, no top-nav link, no celebratory animations.
- No badges on the `Refer & Earn` nav item beyond the optional muted earnings number.
- No emoji or dollar-sign decorations anywhere except the one factual `$150` mention in the search strip.

## Email placements (deferred)

The weekly roundup, onboarding sequence, and post-first-transaction email mention are valuable but require either the email queue scaffolding or modifying templates that don't exist yet in this repo. I'll flag them as a follow-up rather than ship half-wired email triggers. Confirm if you want me to scaffold the transactional templates in a second pass.

---

## Files touched

- `src/components/layout/DashboardLayout.tsx` — add nav item + earnings query
- `src/pages/PaymentSuccess.tsx` — add referral card at bottom
- `src/pages/ListingDetail.tsx` — add contextual share line under share button
- `src/components/layout/Footer.tsx` — add one link to "List & Earn"
- `src/pages/Browse.tsx` (or `Search.tsx`) — add subtle strip after results grid

No new components, no new routes (all targets already exist: `/referral`, `/referral/dashboard`).
