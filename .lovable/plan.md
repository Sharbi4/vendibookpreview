# Concierge-relayed guest inquiries: audit and plan

## What exists today (checked)

- **Guest inquiry intake:** `GuestRequestForm` and `LeadCaptureModal` insert directly into `listing_leads` as anonymous users (columns: listing_id, host_id, email, name, phone, message, source, created_at). The insert policy checks that the listing is public, the host_id matches the listing, and field lengths.
- **Notification:** `notify-listing-lead` emails only the two relay inboxes. The seller email branch is turned off (`if (false && ...)`). The seller gets nothing in the app or by email. This already matches step 1.
- **Privacy leak found:** `listing_leads` has a policy called "Hosts can view their listing leads" (`auth.uid() = host_id`). Through it, a signed-in seller can query guest name, email and phone directly from the database. No seller screen uses it today, but the data is still reachable. This breaks the rule that sellers never see guest contact details.
- **Seller inbox:** `/dashboard/messages` reads `conversations` and `conversation_messages`. In `conversations`, `shopper_id` is required and must be a real profile (NOT NULL, foreign key, unique with listing and host). In `conversation_messages`, `sender_id` is required. Guests have no profile, so a guest thread **cannot** go into these tables without inventing a user. We will not invent one.
- **Message relay (built earlier):** member messages are saved with `held_for_relay = true` and are hidden from the recipient until a backend insert. Seller replies already go to Vendibook first.
- **Admin:** `/admin/messages` (AdminMessages) shows member conversations. It has no guest-lead queue and no approve/dispatch action.
- **This case:** lead `016de038-…` exists (source guest_inquiry, created 2026-10-25 18:29 UTC, listing `3eea8fe1-…`, host `93811767-…`). That listing has no conversations yet.

## Proposed design

```text
Guest form -> listing_leads (private) -> concierge_inquiries (status: pending)
   Admin approves -> [Resend email to seller] + [relay thread + first message shown to seller]
Seller replies (app) -> relay message held (pending review)
Seller replies (email) -> support@ inbox -> admin pastes or links it into the thread as held
   Admin approves -> email to guest (+ optional magic-link guest thread view)
```

### New private tables (admin and backend only, unless noted)

1. **concierge_inquiries**: one row per lead. Holds lead_id (unique), listing_id, seller_id, status (pending, approved, dispatched, rejected), the approved seller-facing text, buyer display name ("Sean C."), dispatched_by (admin id), dispatched_at, resend_message_id (unique), seller_notified_at. Guest email and phone stay only in `listing_leads`.
2. **relay_threads**: listing_id, seller_id, inquiry_id, buyer_display_name. **Sellers** can SELECT their own threads. These rows hold no contact fields.
3. **relay_messages**: thread_id, direction (to_seller or to_buyer), body, status (pending_review, approved, delivered, rejected), author_kind (concierge, seller, guest), author_user_id (the seller or admin, nullable), approved_by, delivered_at, email_message_id, source (app, email_import). Sellers can see messages in their own threads where direction = to_seller and status = delivered, plus their own replies, which they see in every status.
4. **relay_audit**: append-only log of every approve, dispatch, import and reject, with the admin id. Admin read access only.

Every new table gets GRANTs, RLS turned on, and policies in the same migration. Guests and anonymous users get no access.

### Server functions

- **concierge-dispatch-inquiry** (admin only, idempotent):
  - It runs in one transaction and returns early if the inquiry is already dispatched. The transaction claims the inquiry, then creates the thread and the first `to_seller` message as delivered.
  - After the commit, it sends the seller email through the existing Resend transactional sender, using idempotency key `concierge-inquiry-<lead_id>`, and saves the email message id.
  - An option `skip_email` with an `existing_message_id` is used only for backfill.
- **seller-relay-reply** (signed-in seller, owner of the thread): inserts a `to_buyer` message as pending_review, with the existing contact-detail masking. It never contacts the guest. It sends an alert to the relay inboxes.
- **concierge-approve-reply** (admin only, idempotent): emails the guest from the saved lead email. Optionally it issues a signed, expiring magic link to a read-only guest view of that thread, limited to that one thread. It marks the message delivered.
- **Email replies to support@:** these are handled manually. The admin imports the text into the thread as a held `to_buyer` message, with source email_import. Nothing is forwarded automatically. Automatic inbound parsing is out of scope; the current setup has no inbound mail hook.

### Seller UI (frontend)

- **Workspace inbox:** relay threads appear alongside conversations, with the name "Sean C." and a small "Relayed by Vendibook Concierge" label. There is no profile link, avatar lookup, phone or email.
- **Reply box:** it posts through seller-relay-reply. Each sent reply shows the existing neutral "sent" state. No wording explains the relay, following the owner rule.
- **Unread count:** includes delivered relay messages.

### Admin UI

- A new "Guest inquiries" tab in AdminMessages: a pending list showing full lead contact details (admin only), an editable seller-facing text, and buttons to approve and dispatch or reject.
- A replies queue for held seller replies, with approve or reject, and an "Import email reply" action.

### Fix the leak (first step)

- Drop the "Hosts can view their listing leads" policy, keeping the admin, backend and anonymous insert paths.
- Confirm that no seller screen or function relies on it. Code search found only insert usage.

## Backfill for lead 016de038 (only after the steps above ship)

- Run one admin-run call: concierge-dispatch-inquiry with `skip_email = true` and `existing_message_id = 01a17476-e889-7b06-a3b8-7aace4d31388`.
- The call creates the inquiry (dispatched, admin id recorded), the thread ("Sean C."), and one delivered message with the approved text. Each piece is created only once, enforced by unique keys on lead_id and resend_message_id.
- The call sends no email, no in-app notification and no push. The seller sees the message in Messages and nothing else.
- Before running, confirm the exact approved text and the dispatching admin.

## Preventing leaks and duplicate sends

- Contact fields live only in `listing_leads`, which is admin and backend only after the fix. Relay tables never copy them.
- Unique keys on inquiry lead_id and resend_message_id, plus Resend idempotency keys, plus claim-then-send ordering.
- No database triggers send seller emails for relay rows. Only dispatch sends.
- The existing `held_for_relay` member flow, signup phone and ID gates, Square-only rentals, and PayPal sales checkout stay untouched.

## Tests

- RLS checks:
  - A seller cannot read `listing_leads`.
  - A seller sees only their own delivered relay messages and their own replies.
  - Another seller sees nothing.
  - Anonymous users see nothing.
- Function checks:
  - Dispatch called twice produces one thread, one message and one email.
  - Non-admins get a 403.
  - A seller reply is never emailed to the guest before approval.
  - Backfill with skip_email sends nothing.
- UI check: the inbox shows "Sean C." with the relayed label and no contact data.

## Open decisions for the owner

1. Is the guest magic-link thread view wanted now, or is email-only delivery to the guest enough at first?
2. Confirm the exact approved message text and the admin to record for the backfill.
3. Should rejected inquiries notify the guest or stay silent?
