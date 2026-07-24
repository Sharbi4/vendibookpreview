
# Dashboard Redesign — Airbnb-style Workspace

## Goal
Refine the existing DashboardLayout (sidebar, mode switch, mobile bottom nav, 2px indicator) into a calm, photo-forward, progressively disclosed workspace with two clear personas — **Buying** and **Hosting** — and add the missing Orders/Sales Transactions tabs. Navigation + presentation only; no backend, no money logic changes.

## Scope Boundaries
- **Reuse:** `DashboardLayout`, `ShopperDashboard`, `HostDashboard`, `NotificationCenter`, existing hooks (`useShopperBookings`, `useHostListings`, `useEntitlements`, `useHostEntitlements`, `useReferralEarnings`, `useAuth`).
- **Don't rebuild:** sidebar shell, mode switch mechanics, mobile bottom nav container, framer 2px active indicator, existing routes (`/host/listings`, `/host/bookings`, `/host/reporting`, `/dashboard?tab=…`, `/favorites`, `/messages`, `/referral/dashboard`, `/tools/*`, `/account`, `/purchases`, `/verify-identity`, `/notification-preferences`, `/transactions`).
- **No backend / money logic changes.**

## Deliverables

### 1. Terminology + sidebar identity block
- Relabel the mode switch everywhere to **Buying / Hosting** (desktop sidebar, desktop header bar, mobile header). Keep the Kitchen tab (`hasGhostKitchen`) as a separate host nav item; drop the confusing "Kitchen Pro" toggle label.
- Sidebar profile block: avatar, name, persona label ("Buying" / "Hosting"), and an **identity chip** — green "Verified" or amber "Verify now" → `/verify-identity` (uses `useAuth().isVerified`).
- Group nav into sections with subtle uppercase headers (Workspace / Account) and add a bottom **Account group**: Profile & Account, Membership & Billing, Identity Verification. Add a divider before it.

### 2. Sidebar nav — new tabs (both personas)

**Buying**
1. Overview — `/dashboard?view=shopper`
2. Orders & Transactions — `/dashboard?view=shopper&tab=orders` *(new)*
3. Bookings & Rentals — `/dashboard?view=shopper&tab=bookings`
4. Favorites — `/favorites`
5. Messages — `/messages` (unread badge preserved)
6. Notifications — `/dashboard?view=shopper&tab=notifications` *(new: NotificationCenter feed + link to `/notification-preferences`)*
7. Refer & Earn — `/referral/dashboard` (earned badge preserved)
8. Premium Tools — `/dashboard?view=shopper&tab=tools` *(new: entitlements-aware grid → `/tools/*`)*
9. Account group: Profile (`/account`), Membership & Billing (`/account/subscription` + `/purchases`), Identity Verification (`/verify-identity`)

**Hosting**
1. Overview — `/dashboard?view=host`
2. Listings — `/host/listings`
3. Sales & Transactions — `/dashboard?view=host&tab=sales` *(new)*
4. Booking Manager — `/host/bookings`
5. Insights & Reporting *(merged)* — `/dashboard?view=host&tab=insights` with sub-tabs (Insights / Reporting) inside the page
6. Promote & Upgrades — `/dashboard?view=host&tab=promote`
7. Membership — `/dashboard?view=host&tab=membership` *(new: HostSubscriptionCard + link to `/account/subscription`)*
8. Permits, Messages, Notifications, Refer & Earn
9. Kitchen (conditional on `hasGhostKitchen`)
10. Account group: Profile, Payouts (Stripe Connect status card), Notification Settings, Identity Verification

### 3. Overview redesign (max 4 sections, action-required first)

**Buying Overview**
- `ActionRequiredStack` (new): unpaid booking, order awaiting confirmation, unverified identity, unread messages — each a compact row with icon + CTA.
- Active orders: cover thumbnail + title + status timeline pill.
- Upcoming rentals (approved bookings): cover thumbnail + date range.
- Recent favorites: photo grid (4 cards) each with **Share** button.
- One "Start your food business" shortcut card → `/tools/permitpath`.

**Hosting Overview**
- `ActionRequiredStack`: pending booking requests, sales awaiting confirmation, Stripe onboarding incomplete, unverified identity.
- Earnings snapshot (existing hooks).
- Listing performance cards with cover photos.
- Next payout card.

### 4. New tab pages (thin composers over existing components)
- `BuyerOrdersTab` — buyer `/transactions` rows with cover images + order-tracking deep links. Sidebar badge = in-progress count.
- `HostSalesTab` — host `/transactions` rows (mirror composition).
- `FavoritesTab` — extend Favorites into dashboard as a photo grid with Share.
- `NotificationsTab` — NotificationCenter feed + prominent link to `/notification-preferences`.
- `PremiumToolsTab` — grid of `/tools/*` entries; each card shows Unlocked/Premium chip driven by `useHostEntitlements`.
- `InsightsReportingTab` — single tab with sub-view pills (Insights / Reporting) replacing the two separate entries.
- `MembershipTab` (host) — `HostSubscriptionCard` + CTA to `/account/subscription`.
- `PromoteUpgradesTab` — existing PromotionHub + active boosts with expiry from `useEntitlements`.
- `PayoutsPanel` (host account group) — Stripe Connect status + `/host/payouts` link.

### 5. Shared components
- `SharePopover` — copy link + native share (`navigator.share` fallback). Reused for listings, favorites, referral link (`/share/listing/:id`, `/referral/dashboard`).
- `IdentityChip` — Verified / Verify now, tied to `useAuth().isVerified`.
- `ActionRequiredStack` + `ActionRequiredCard` — one-line row: icon, message, CTA.
- `EmptyState` — inviting empty (photo + one CTA); replaces bare "No items" blocks.
- `PhotoListingCard` — small cover-image row (used in orders/bookings/listings tabs).

### 6. Mobile bottom nav
- **Buying:** Explore (`/search`), Orders (`?tab=orders`), Bookings (`?tab=bookings`), Inbox, Profile.
- **Hosting:** Overview, Listings, Manager, Inbox, Profile.

### 7. Publish gate
- In the listing wizard publish step (or `handlePublish`): if `!isVerified`, block publish with a friendly modal ("Verify your identity to publish — drafts are safe") and a "Verify now" CTA to `/verify-identity`. Drafts still save. Verify current enforcement first; add only if missing.

## Technical Notes
- All new tab views mount inside `Dashboard.tsx` via `searchParams.get('tab')` switch (same pattern as existing `permits` tab). No new routes needed.
- Sidebar nav becomes a data-driven list with `section` + `badge` fields; render two sections plus Account group.
- Identity chip reads `useAuth().isVerified`; no new hooks.
- Sub-view pills inside `InsightsReportingTab` use local state; no URL churn.
- Fonts/tokens: use existing `text-foreground`, `text-muted-foreground`, `bg-background`, `bg-muted`, `border-border`. No new colors, no glassmorphism.
- No edits to `create-checkout`, entitlements resolution, or Stripe functions.

## Verification
- `bunx tsgo --noEmit` at the end.
- Manual: load `/dashboard` on both personas, click each new tab, resize to mobile, toggle Buying↔Hosting, confirm identity chip states.

## Out of Scope
- Backend edits, new edge functions, schema changes.
- Redesign of `/transactions`, `/favorites`, `/tools/*` pages themselves (dashboard tabs link into or compose existing components).
- Any pricing / fee / entitlement rule changes.
