# Polish ask: snow cone trailer rental, Anna TX (2026-10-14)

**Status: STAGED (low priority). The owner approves sends.** Requested by the 20:22 UTC pulse.

## Listing (checked read-only)

- **Listing:** `80199c47-a1d7-4b4d-b7c5-edad6442d6ee`, a rental. Edited 19:41 UTC.
- **Host:** `6636472b…`, account created 10-09, 1 listing.
- **Price:** $100/day, $750/week, $1,800/month.
- **Photos:** 3.
- **Condition:** `good`, already set.
- **Category:** `food_truck`, but the title says "trailer".
- **Fulfilment:** `both` (pickup and delivery).

The pulse's 3rd ask is dropped. `included_items` is already filled in and fulfilment is already set, so asking again would be redundant.

## Send checks

- No campaign email in the last 14 days.
- Transactional emails: `welcome` and `listing-published` on 10-09 only.
- Not unsubscribed, not suppressed, not on the do-not-contact list.
- No other staged ask.

## Content

We don't change the category ourselves. The seller picks. No view counts.

```json
{
  "mode": "preview_html",
  "variant": "polish",
  "excludeUserIds": ["f2865e60-125e-4921-b7c5-898ba1675045"],
  "polish": {
    "hostId": "6636472b-46ed-41ae-93ae-24d8853e0f93",
    "featuredTrialOffer": false,
    "items": [
      {
        "listingId": "80199c47-a1d7-4b4d-b7c5-edad6442d6ee",
        "suggestedTitle": null,
        "asks": [
          "Check the category. It's listed as Food Truck, but your title says trailer. Choosing Food Trailer puts it in front of renters looking for trailers.",
          "Add a few more photos. You have 3. Renters want to see the shaver, the sinks and the generator hookup before they book."
        ]
      }
    ]
  }
}
```

**To send, once the owner approves:** run `preview_html`, then `test`, then `broadcast` with `"confirm": "2026-10-seller-concierge"` and the same `polish` object.
