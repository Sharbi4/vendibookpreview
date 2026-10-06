# Polish ask — "Tap Trailer For Ice Cold Beverages" (2026-10-06)

Requested by the hourly pulse. Listing `045054bb-2356-42ee-bc5e-a7850101d77e` (host `55ded958…`): for sale at $11,000 in NM, 8 photos, edited today, `condition` is NULL. Because the condition is empty, buyers who filter by condition never see the listing, and it shows no condition badge.

Checks:
- No concierge or other campaign email to this host in the last 14 days.
- Not unsubscribed.

We **ask**; we never set or guess the condition. The choices offered match the listing editor's `CONDITION_OPTIONS`: New, Like new, Good, Fair, Needs work.

The email is sent through `send-seller-concierge` with the `polish` variant: Resend marketing shell, signed Brad, one edit button, no view counts.

```json
{
  "mode": "preview_html",
  "variant": "polish",
  "polish": {
    "hostId": "55ded958-2c29-4d79-8440-9f77fdca0c5c",
    "featuredTrialOffer": false,
    "items": [
      {
        "listingId": "045054bb-2356-42ee-bc5e-a7850101d77e",
        "suggestedTitle": null,
        "asks": [
          "Set the condition: New, Like new, Good, Fair or Needs work. Buyers who filter by condition can't see your listing until it's set, and it adds a condition badge to your listing.",
          "If you pick anything other than New, add a line to the description about recent maintenance or anything a buyer should know."
        ]
      }
    ]
  }
}
```

Run it in this order: `preview_html`, then `test`, then `broadcast` with `"confirm": "2026-10-seller-concierge"` and the same `polish` object. This uses the host's single concierge send.
