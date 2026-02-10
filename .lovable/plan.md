

## Changes Overview

Four improvements to the listing creation and signup flow:

### 1. Remove phone number from AuthGateModal signup

**File:** `src/components/listing-wizard/AuthGateModal.tsx`

- Remove the `phoneNumber` state variable, its Zod validation rule, and the entire phone number input field from the signup form
- Remove `phone_number` from the Supabase `signUp` metadata and admin notification payload
- Keep first name, last name, email, and password only

### 2. Redirect to listing creation after signup in AuthGateModal

**File:** `src/components/listing-wizard/AuthGateModal.tsx`

- The `onAuthSuccess` callback already handles post-auth flow (claiming draft and continuing the wizard). No routing change needed here -- the modal is used inline within the PublishWizard and the user stays on the same page after auth succeeds.
- The `emailRedirectTo` already points to `/create-listing/{draftId}` for email confirmation flows, which is correct.

### 3. Change "Add Asset" button to "Add a Listing" and link to `/create-listing` flow

**File:** `src/components/dashboard/HostDashboard.tsx` (line 133)

- Change label from `'Add Asset'` to `'Add a Listing'` (and `'Sell Item'` stays or also becomes `'Add a Listing'`)
- Since the user is already signed in from the dashboard, change the `to` link from `/list` (the landing page) to keep `/list` but switch it so clicking it goes directly into the wizard mode. Actually, looking at the flow: `/list` shows a landing page first, then you click "Start" to see the QuickStartWizard. For signed-in users from the dashboard, we should navigate directly to `/list` but auto-trigger wizard mode. The simplest approach: add a query param like `/list?start=true` and have `ListPage` auto-enter wizard mode when that param is present.

**File:** `src/pages/List.tsx`

- Check for `?start=true` query param on mount; if present and user is signed in, auto-set mode to `'wizard'`

### Technical Summary

| File | Change |
|------|--------|
| `src/components/listing-wizard/AuthGateModal.tsx` | Remove phone number field, state, validation |
| `src/components/dashboard/HostDashboard.tsx` | Change "Add Asset" to "Add a Listing", link to `/list?start=true` |
| `src/pages/List.tsx` | Auto-enter wizard mode when `?start=true` param is present and user is logged in |

