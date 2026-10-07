# Polish ask: "TURNKEY SHIPPING CONTAINER KITCHEN" (2026-10-07)

Requested by the hourly pulse (20:22 UTC). Checked read-only.

**Listing** `f4d5e5ae-31eb-4ba0-9d2b-13df7279d020`, host `f2865e60…`:
- For sale in Atlanta, GA, at $18,000. 6 photos.
- Edited by the seller at 20:12.
- `condition` is NULL.
- The title has 🔥 emoji and is all caps.

**Host:**
- No campaign email in the last 14 days.
- Not unsubscribed.
- Has 1 live listing.

We **ask**, and never set the condition or change the title for the seller. The condition choices match the listing editor exactly: New, Like new, Good, Fair, Needs work.

Not included in the email:
- **Category.** The listing is filed as `food_trailer` although it's a shipping container kitchen. We left this out to keep the ask short, and flagged it to the Growth lead instead.
- **View counts.** Never sent to sellers (owner rule).

The email goes through `send-seller-concierge` with the `polish` variant: Resend marketing shell, signed Brad, one edit button.

```json
{
  "mode": "preview_html",
  "variant": "polish",
  "polish": {
    "hostId": "f2865e60-125e-4921-b7c5-898ba1675045",
    "featuredTrialOffer": false,
    "items": [
      {
        "listingId": "f4d5e5ae-31eb-4ba0-9d2b-13df7279d020",
        "suggestedTitle": "Turnkey Shipping Container Kitchen, Atlanta GA",
        "asks": [
          "Set the condition: New, Like new, Good, Fair or Needs work. Buyers who filter by condition can't see your listing until it's set.",
          "Use a plain title without emoji or all caps, like the suggestion above. A plain title is easier for buyers to read and find."
        ]
      }
    ]
  }
}
```

Run the call three times, keeping the same `polish` object:

1. `preview_html`
2. `test`
3. `broadcast` with `"confirm": "2026-10-seller-concierge"`

This uses the host's single concierge send.
