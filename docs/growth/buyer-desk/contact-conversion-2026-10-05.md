# Converting Existing Contacts into Deals (2026-10-05)

Read-only review of every buyer contact in the last 120 days. Email rule: **all sends go through the app's email systems (transactional templates via `invokeTransactionalEmail`, or marketing templates via Resend), never a personal mailbox.**

## Open contacts

| Contact | Listing | State | Real buyer? | Next step | Owner |
|---|---|---|---|---|---|
| Conversation `a1bede9a…` (Sep 17) | Lilburn, GA rental, $350/day · $5k/mo | Buyer asked "is it licensed for Atlanta/Stonecrest?" (seller replied yes), then "**Do you set on location?**". **Unanswered for 18 days.** | Yes: account active since 9/17, no safety flags, specific operational questions | Automated: `send-unanswered-message-reminders` sends the seller a reminder now and a final one 48h later, then alerts the concierge. Concierge: call the seller if there's no reply by the final reminder. | Buyer Desk (code), concierge |
| Offer `71ae1a2b…` $15k on $20k (Sep 11, expired) | "My Food Trailer", Seguin TX | Expired with no seller response | Yes | Covered by Supply Desk R-1 (seller first, then buyer) | Supply Desk |
| Offer `a4ab5437…` $22k on $40k (Jun 9, expired) | Bradenton FL trailer, buyer needs NJ | 4 months old | Yes (needs freight) | Covered by Supply Desk R-2. If the seller is still selling, mention Vendibook Freight to the buyer (NJ delivery) | Supply Desk |
| Conversation `c23b5720…` (Jun 19) | Charlotte commissary | Buyer asked about ovens; seller said "no ovens". Buyer went quiet | Yes | Closed-lost (doesn't fit). No follow-up; we have no NC commissary with ovens | — |
| 2 empty conversations + 2 offers, $67k and $30k (Oct 4, both cancelled) | NJ trailer and CA BBQ smoker | Both offer notes **auto-removed for personal contact info**; 4 contacts in 11 minutes across 2 states from a same-day account; 1 safety event | **No: scam tells** (off-platform contact, same pattern sent to many sellers) | **Suspended 2026-10-05** by the Growth lead (`6f524614-4438-4e6e-ab32-e77fcc21a01d`), and on a message sending hold. Never routed. | Done |

**Two knock-on fixes from this account (2026-10-05).** Its 4 fake contacts were being counted as real:
1. **Metrics:** they were 4 of 6 contacts in 30 days and all 4 in the last 7, so the scorecard read 1.30% over 7d when the real rate was 0%. `demand-scorecard.sql` now excludes suspended and held accounts and reports them on their own line.
2. **Seller nudges:** `send-listing-fix-nudges` treated "has a contact" as a reason to skip a listing, so the San Dimas, CA BBQ smoker (26 real views, scam contacts only) would have been silenced. Contacts from suspended or held accounts no longer count.

## Process now in code
- **Unanswered buyer messages → seller reminders** (`send-unanswered-message-reminders`, transactional template `message-reply-reminder`, same layout as `new-message`):
  - 24h after an unanswered buyer message: reminder to the seller.
  - 48h later: final reminder, plus a concierge alert to support@.
  - Skips buyers who are suspended, on a hold, or have open safety events; skips listings that aren't live and sellers who turned off message emails; masks contact details in the quoted question.
  - Needs an hourly cron (internal service-role call). `{"dry_run": true}` lists what it would send.
- **Offer expiry rescue:** the Supply Desk owns this (05-offer-rescue.md).
- **Listings with views but no contacts → seller fix nudge** (`send-listing-fix-nudges`, marketing template via Resend, admin-triggered).

## Scam screen applied before any routing
Off-platform payment or contact (Zelle, Cash App, wire, gift cards, "my shipper", phone or email in the first message), overpayment, overseas buyer posing as local, the same text sent to many sellers, a brand-new account making several contacts in minutes. Any of these → don't route; flag the record id to the Growth lead.
