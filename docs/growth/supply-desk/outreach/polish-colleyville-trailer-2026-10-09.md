# Polish ask: "Food Trailer" in Colleyville, TX (2026-10-09)

**Status: STAGED. The owner approves sends.** Requested by the pulse at 02:22 UTC.

## Listing

`cc3c8214-e327-4670-99ed-e1425494cc8c`, host `f1258300…`
- For sale at $5,000. Edited at 01:23 UTC.
- 3 photos.
- Fields still empty: `condition`, `year_built`, `length_inches`, `width_inches`, `make`.
- The title is just "Food Trailer".
- It had a paid feature that expired on 2026-07-02.

## Pre-send checks (read-only)

- No campaign email in the last 14 days and no transactional email in the last 10 days.
- Not unsubscribed, suppressed or on the do-not-contact list.
- No other ask is staged for this host.

Because the size and year aren't recorded, we don't invent a title. The ask shows the format with an example and tells the seller to use their trailer's real size and year. The seller sets the condition; we never set it. No view counts.

**Interaction with rent-while-you-sell:** this listing is in the TX audience for that campaign (it was #3 at launch). Its 3-day cooldown after a concierge send keeps the two emails apart.

```json
{
  "mode": "preview_html",
  "variant": "polish",
  "excludeUserIds": ["f2865e60-125e-4921-b7c5-898ba1675045"],
  "polish": {
    "hostId": "f1258300-750f-4bac-8924-2a0194f88e75",
    "featuredTrialOffer": false,
    "items": [
      {
        "listingId": "cc3c8214-e327-4670-99ed-e1425494cc8c",
        "suggestedTitle": null,
        "asks": [
          "Give the title more detail: size, year and city, for example \"2015 7x14 Food Trailer, Colleyville TX\" with your trailer's real size and year.",
          "Set the condition: New, Like new, Good, Fair or Needs work. Buyers who filter by condition can't see your listing until it's set.",
          "Add more photos. You have 3. Buyers want to see the interior, the kitchen equipment, and the hitch and axles."
        ]
      }
    ]
  }
}
```

**To send, once the owner approves:** run `preview_html`, then `test`, then `broadcast` with `"confirm": "2026-10-seller-concierge"` and the same `polish` object.
