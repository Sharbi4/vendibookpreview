# Polish ask: Pre-owned concession trailer, Baton Rouge LA (2026-10-14)

**Status: STAGED. The owner approves sends.** Requested by the 12:23 UTC pulse.

## Listing

`779d5773-de60-4075-b92d-32387da86dd3`, host `3b59adbf…` (1 live listing)

- For sale at $19,500 with 6 photos. Last edited 10:27 UTC.
- Title: "Pre-Owned Concession Trailer with Deep Freezer – Priced to Sell".
- Empty fields: `condition`, `year_built`, `make`, `title_status`. Offers are off.

## Checks (read-only)

All clear:
- no campaign email in the last 14 days
- no transactional email in the last 10 days
- not unsubscribed or suppressed
- not on the do-not-contact list
- no other staged ask (the host appears only in the 10-05 concierge reference CSV, and nothing was sent)

## Content

The title says "Pre-Owned", so the unit is used. Which used grade applies is the seller's call, so the ask lists only the used options and we never pick one. No view counts.

```json
{
  "mode": "preview_html",
  "variant": "polish",
  "excludeUserIds": ["f2865e60-125e-4921-b7c5-898ba1675045"],
  "polish": {
    "hostId": "3b59adbf-20d5-4154-a54e-bf20a1bddbed",
    "featuredTrialOffer": false,
    "items": [
      {
        "listingId": "779d5773-de60-4075-b92d-32387da86dd3",
        "suggestedTitle": null,
        "asks": [
          "Set the condition in the listing editor. Your title says pre-owned, so pick the one that fits best: Like new, Good, Fair or Needs work. Buyers who filter by condition can't see your trailer until it's set.",
          "Add the build year and answer the title question so buyers can compare it with other trailers."
        ]
      }
    ]
  }
}
```

**Sending (after the owner approves):** run `preview_html`, then `test`, then `broadcast` with `"confirm": "2026-10-seller-concierge"` and the same `polish` object.
