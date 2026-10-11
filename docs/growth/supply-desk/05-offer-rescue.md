# Offer Rescue Loop & Seller Response SLAs

_Supply Desk · data and code checked 2026-10-05 on `fix/paypal-webhook-config`_

## Where we are

| | Today |
|---|---|
| Offers, all time | **4**, but only **2 real**: both expired unanswered (Jun 9, Sep 11). The 2 cancelled on Oct 4 came from an account the safety system deactivated for off-platform contact attempts under a different identity (`message_sending_holds`). Send-ready rescue copy for the 2 real offers: `outreach/offer-rescue-2026-10-05.md` |
| Seller response to offers | **0 of 2** real offers |
| Conversations (90 days) | 3. The seller replied in 1, after **12.1 hours** to first reply |
| Listing leads / booking requests (90 days) | 0 / 0 |
| Video walkthrough requests (30 days) | 5 |
| New-offer notification | **Email only** (`send-offer-notification` → `offer-received-seller`), with one "Review offer" button to `/dashboard?offer=<id>` |
| SMS on new offer | **None.** `send-sms` exists, but the offer flow doesn't call it |
| Reminder before expiry | **None** |
| Admin alert on an unanswered offer | **None** |
| Offer expiry | 48 hours (`expire-stale-offers`); counters also 48 hours |

**Diagnosis.** At this volume every offer is precious. The 2 real offers were $15k and $22k. The seller gets one email and nothing else, and the offer quietly expires 48 hours later.

## The loop

```
Buyer makes an offer (t = 0)
  ├─ Email to the seller: amount, buyer note, asking price, and 3 buttons:
  │    [Accept $X]  [Counter]  [Decline]   (each deep-links; sign-in required)
  ├─ SMS to the seller, only if sms_preferences.transactional_status = 'opted_in':
  │    "Vendibook: $X offer on your {title}. Accept, counter or decline: {link}  Reply STOP to opt out"
  └─ In-app + push notification (existing notifications pipeline)

t = 12h, no response
  ├─ Re-nudge the seller: email "Your $X offer expires in 36 hours" + SMS (opted-in only)
  └─ Buyer gets a reassurance note: "We've reminded the seller. Offers stay open 48h."

t = 36h, no response
  ├─ Admin alert (send-admin-notification, type offer_unanswered), with seller phone (if on file),
  │    listing, amount, buyer and hours open → ops CALLS the seller
  └─ Seller gets a final email: "12 hours left to respond to $X"

t = 48h, no response → offer expires (existing behaviour)
  ├─ Buyer: "The seller didn't respond in time", plus 3 similar listings
  └─ Seller's listing gets a "responds slowly" internal flag (see SLAs)
```

**Guardrails:**

- The 1-tap links never act without sign-in. Accept opens a confirm screen, and the accept is the seller's own authenticated action.
- No action ever runs from the email link alone.
- Every send is idempotent per (offer, step). Quiet hours in `send-sms` are respected, except that a 36h-or-later final reminder may go out in the morning.
- No payment changes. Square and PayPal stay as they are.

## Seller response SLAs

| Event | Target first response | Escalation |
|---|---|---|
| Offer | **≤12 h** (hard limit 48 h, then it expires) | 12 h re-nudge → 36 h admin call |
| New conversation / question | **≤24 h** | 24 h re-nudge → 48 h admin alert if the listing is ≥ $10k |
| Video walkthrough request | **≤24 h** to propose a time | 24 h re-nudge |
| Rental booking request | **≤12 h** | 12 h re-nudge → 24 h admin alert |

How we use the SLAs:

- **Show it.** Sellers with ≥3 contacts and a median response under 12 hours get a "Usually responds within X hours" badge on their listings. Sellers with no history show nothing; we never display "slow".
- **Rank by it.** Listings whose seller missed 2 SLAs in a row lose search boost until they respond to a contact. Applied quietly, with no public label.
- **Coach it.** After a missed SLA, send C-7 below once.

### C-7 Missed-offer coaching (after an expiry)

**Subject:** You missed a ${amount} offer on your {title}

> A buyer offered ${amount} and the offer expired before you responded. It happens. To make sure you see the next one: turn on text alerts for offers ({sms_settings_url}), and set a minimum offer so you only hear about serious ones. Offers stay open 48 hours.

## What gets built

Each item is spec'd in `06-lovable-prompts.md`; app-code changes go to the Growth lead for review.

1. **3-button offer email.** Update `offer-received-seller` so the buttons go to `/dashboard?offer=<id>&action=accept|counter|decline`. The dashboard opens the existing offer dialog preset to that action.
2. **SMS on new offer.** `send-offer-notification` also calls `send-sms` (template `offer_received`, category transactional) when the seller has transactional opt-in.
3. **`offer-rescue-sweep`.** An hourly edge function that sends the 12 h nudge, the 36 h admin alert and the final reminder. It needs additive, nullable columns on `offers`: `seller_nudged_at`, `admin_alerted_at`, `final_reminder_at`.
4. **Response-time badge plus quiet rank penalty.** Later, once we have enough contact volume to compute a median.

**Measure:**

- % of offers responded to within 12 h and within 48 h.
- Median seller first-response time across all contact types.
- Count of offers reaching the 36 h admin alert.

Targets for the first 60 days: response within 48 h on 80% of offers, and a median first response under 12 h.
