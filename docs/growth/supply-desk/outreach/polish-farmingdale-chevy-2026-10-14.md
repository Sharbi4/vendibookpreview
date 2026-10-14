# Polish ask: 1955 restored Chevy food truck, Farmingdale NJ (2026-10-14)

**Status: STAGED. The owner approves sends.** Requested by the 07:21 UTC pulse.

## Listing

`f5582bd0-afac-44f1-9f85-3acf24c279f5` (host `863d4cc1…`, 1 live listing)
- For sale at $135,000, 24 photos, last edited 05:17 UTC.
- Empty fields: `condition`, `year_built`, `make`, `title_status`. Offers are off.
- The title already says "Vintage (1955) … Chevy", so the year and make can go into the fields without guessing.

## Checks (read-only)

- No campaign email in the last 14 days.
- Not unsubscribed, not suppressed, not on the do-not-contact list.
- No other staged ask. The host appears only in the 10-05 concierge reference CSV, and nothing was sent.
- **Before sending, look at the support thread.** The host received a `support-reply` on 2026-10-07. If that conversation is still open or touches this listing, reply in the thread instead of sending this email.

We ask; we never set the condition ourselves. The choices match the editor: New, Like new, Good, Fair, Needs work. No view counts.

```json
{
  "mode": "preview_html",
  "variant": "polish",
  "excludeUserIds": ["f2865e60-125e-4921-b7c5-898ba1675045"],
  "polish": {
    "hostId": "863d4cc1-7581-4d3c-8d73-6b33740931cf",
    "featuredTrialOffer": false,
    "items": [
      {
        "listingId": "f5582bd0-afac-44f1-9f85-3acf24c279f5",
        "suggestedTitle": null,
        "asks": [
          "Set the condition: New, Like new, Good, Fair or Needs work. Buyers who filter by condition can't see your truck until it's set, and at this price they'll want it stated.",
          "Add the year (1955) and make (Chevrolet) in the listing fields too, not just the title. Buyers search and filter on those fields.",
          "Answer the title question so buyers know the paperwork is in order."
        ]
      }
    ]
  }
}
```

**To send, once the owner approves:** `preview_html` → `test` → `broadcast` with `"confirm": "2026-10-seller-concierge"` and the same `polish` object.
