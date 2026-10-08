# Polish ask: "Food Truck renovated inside - out" (2026-10-08)

**Status: STAGED. The owner approves sends.** Requested by the 20:22 UTC pulse.

## Listing

`10ae96b2-12c7-413a-a612-92110bc2050e`, for sale in Austin, TX:
- $37,500, 14 photos, edited by the seller at 19:54 UTC.
- `condition` is NULL. `accepts_offers` is false. `title_status` is NULL.
- This is the host's only live listing.

## Host and send checks (read-only)

Host `5fbd89d5…`:
- **Cooldowns:** no campaign email in the last 14 days and no transactional email in the last 10 days. Not featured.
- **Suppression and do-not-contact:** not unsubscribed, not suppressed, not on the do-not-contact list.
- **Pending asks:** none. The host appears only in the 2026-10-05 concierge reference list, and nothing was sent to them. This polish email becomes their single concierge send.
- **Origin of the edit:** the seller made it. Supply Desk never writes to listings.

## Content

We ask the seller to set the condition; we never set it ourselves. The choices match the editor exactly: New, Like new, Good, Fair, Needs work. The email contains no view counts.

```json
{
  "mode": "preview_html",
  "variant": "polish",
  "excludeUserIds": ["f2865e60-125e-4921-b7c5-898ba1675045"],
  "polish": {
    "hostId": "5fbd89d5-fa6b-424c-97b8-dea19753eda8",
    "featuredTrialOffer": false,
    "items": [
      {
        "listingId": "10ae96b2-12c7-413a-a612-92110bc2050e",
        "suggestedTitle": null,
        "asks": [
          "Set the condition: New, Like new, Good, Fair or Needs work. Buyers who filter by condition can't see your truck until it's set.",
          "Turn on offers, with a minimum you're comfortable with, and answer the title question. Most buyers at this price start with an offer."
        ]
      }
    ]
  }
}
```

## Sending (once the owner approves)

1. `preview_html`
2. `test`
3. `broadcast` with `"confirm": "2026-10-seller-concierge"` and the same `polish` object.
