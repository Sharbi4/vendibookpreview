# Outreach — how to send

**Owner rule (2026-10-05):** every email goes through **Resend**, using the established templates with the current logo, and stays consistent with the emails we've already sent. Outreach and coaching use the **marketing** templates (`_shared/marketing-templates/`, `marketingShell`). Account and transaction events use the **transactional** templates (`_shared/transactional-email-templates/`). No Gmail, and no plain-text one-offs.

## Seller concierge (Brad) — `send-seller-concierge`

- Template: `_shared/marketing-templates/seller-concierge.ts`. Same shell, fix list (`listingFixes.ts`), safety note and unsubscribe as the Growth lead's `listing-fix-nudge`. Preview: `seller-concierge-preview.png` (the logo loads in real inboxes).
- Variants: **fix_title** (placeholder or broken title), **rescue** (verified missed offer), **welcome** (published ≤7 days), **featured** (complimentary feature active), **optimize** (fixes from `pickListingFixes`), **share** (nothing left to fix). There's no contact-details variant: phone numbers and emails are stripped automatically on save.
- Order: featured, then offers-off, then the rest. Sends at most `limit` per call (default 20), so run it hourly.
- Skips: unsubscribed, suppressed and unmailable addresses, internal accounts, admins, `excludeUserIds`, anyone already sent this campaign, and anyone who got the listing-fix nudge in the last 14 days.
- Run order: `{"mode":"preview_count"}` → `{"mode":"test","testEmail":"<owner>","variant":"featured"}` → `{"mode":"broadcast","confirm":"2026-10-seller-concierge","limit":20,"excludeUserIds":["77f157af-d5d8-4be4-95d8-a1b755c6c6a1"]}` hourly until `remaining` is 0.
- `seller-concierge-2026-10-05.csv` is the earlier hand-written copy, kept for reference. The function computes the live audience and fixes itself.

## Offer rescues

`offer-rescue-2026-10-05.md`: 2 one-off seller emails. Send them through the same marketing shell, signed Brad. The JSON blocks hold the copy.
