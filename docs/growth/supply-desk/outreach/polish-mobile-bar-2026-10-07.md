# Polish ask: "Fully Built 1994 S&H mobile Bar" (2026-10-07)

**Status: STAGED. The owner approves sends.** Requested by the Growth lead at the 22:22 UTC pulse.

## What the read-only check found

**Sale listing** `a2a2f761-da8c-4f59-ad5c-6a8b54f67083`:
- For sale in Magnolia, TX at $25,000, with 8 photos.
- Edited at 21:36. `condition` is NULL.

**The same host's other live listing**, the rental `55edfe53` ("Mobile Bar Trailer", Tomball, TX), also has no condition. Each host gets only one concierge send, so this email covers both listings. Otherwise the rental would never be asked.

**Host** `454f16ce…`: no campaign email in the last 14 days, not unsubscribed, and not on the do-not-contact list.

## What the email does

We **ask** the seller to set the condition; we never set it for them. The choices match the listing editor: New, Like new, Good, Fair, Needs work. The email never mentions view counts.

**Asks added at the Growth lead's request (the seller decides; we change nothing):**
- **Category check.** The sale listing's category is `food_truck`. But S&H is a trailer builder, and the host's rental is filed as `food_trailer`.
- **Possible duplicate unit.** Tomball and Magnolia are next to each other, so the two listings may be the same unit. If they are, we suggest relisting the rental from the sale listing with "Rent it while you sell it".

  **Note on accuracy:** linking does **not** close the rental automatically when the sale completes. No trigger, function or app code does that today; the link only shows "Manage rental" on the sale card. So the email tells the seller to pause the rental themselves if the trailer sells.

The email goes through `send-seller-concierge` with the `polish` variant: Resend marketing shell, signed Brad, with an edit button for each listing.

```json
{
  "mode": "preview_html",
  "variant": "polish",
  "excludeUserIds": ["f2865e60-125e-4921-b7c5-898ba1675045"],
  "polish": {
    "hostId": "454f16ce-dcff-4a55-a5a1-e91e158758fe",
    "featuredTrialOffer": false,
    "items": [
      {
        "listingId": "a2a2f761-da8c-4f59-ad5c-6a8b54f67083",
        "suggestedTitle": null,
        "asks": [
          "Set the condition: New, Like new, Good, Fair or Needs work. Buyers who filter by condition can't see your listing until it's set.",
          "Check the category. It's listed as Food Truck. If it's a towable trailer (S&H builds trailers), choose Food Trailer so the right buyers find it.",
          "If this is the same trailer as your Tomball rental, you can relist the rental from this listing with \"Rent it while you sell it\" (the Rent it out button on your listing). The two then stay linked to the same trailer in your dashboard. If it sells, remember to pause the rental."
        ]
      },
      {
        "listingId": "55edfe53-5622-438f-b663-7ced764cc9ca",
        "suggestedTitle": null,
        "asks": [
          "Set the condition here too, so renters know what to expect."
        ]
      }
    ]
  }
}
```

**To send, once the owner approves:** run `preview_html`, then `test`, then `broadcast` with `"confirm": "2026-10-seller-concierge"` and the same `polish` object.
