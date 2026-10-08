# Polish asks: two Florida sale listings (2026-10-08)

**Status: STAGED. The owner approves all sends.** Requested by the pulse at 19:53 UTC.

**ID correction:** the pulse sent `efa664df-fd12-4457-8760-4eba5f810c6f`, and no listing has that ID. The Bradenton $40k food trailer with 9 photos is `efa664df-1f34-421f-90f8-2ebc88e471fd` (same first 8 characters). That is the **offer-rescue R-2 listing**.

All checks below are read-only.

## 1. Bradenton, FL: "Food trailer (Indian food truck)"

- **Listing:** for sale at $40,000, 9 photos, edited at 19:41 UTC today.
  - `condition`: NULL
  - `accepts_offers`: false
  - `title_status`: NULL
  - "what's included": empty
- **Seller** `33fb896d…` is the R-2 rescue seller.
  - A $22,000 offer from June 9 expired without a reply.
  - Today's edit is their first activity since June, which strongly suggests the trailer is still for sale.
  - The concierge send is one per host and none has gone out yet, so this polish email **replaces** the staged "still for sale?" rescue email (R-2 in `offer-rescue-2026-10-05.md`). Asking "is it still for sale?" now would look out of touch.
  - The R-2 **buyer** follow-up still needs the seller's explicit confirmation. A listing edit is not a confirmation.
- **Send checks:** no campaign email in the last 14 days, no transactional email in the last 10 days, not unsubscribed, not on the do-not-contact list.

## 2. Wesley Chapel, FL: "Fully equipped food truck, full kitchen, newly built kitchen, Mint condition"

- **Listing:** for sale at $85,000, **3 photos**, edited at 19:42 UTC today.
  - `condition`: NULL. The title says "Mint condition", but that is not the seller-declared field, so we ask rather than guess.
  - `accepts_offers`: false
  - `title_status`: NULL
  - `year_built`: NULL
- **Seller** `14242a2e…` has 1 live listing.
- **Send checks:** no campaign email in the last 14 days, no transactional email in the last 10 days, not unsubscribed, not suppressed, not on the do-not-contact list.

Both emails use the `polish` variant: Resend marketing shell, signed Brad, one edit button each, no view counts. We never set any field for the seller.

```json
[
{
  "mode": "preview_html",
  "variant": "polish",
  "excludeUserIds": ["f2865e60-125e-4921-b7c5-898ba1675045"],
  "polish": {
    "hostId": "33fb896d-2c60-42e7-b3eb-20d2e44ee08e",
    "featuredTrialOffer": false,
    "items": [
      {
        "listingId": "efa664df-1f34-421f-90f8-2ebc88e471fd",
        "suggestedTitle": null,
        "asks": [
          "Set the condition: New, Like new, Good, Fair or Needs work. Buyers who filter by condition can't see your listing until it's set.",
          "Turn on offers, with a minimum you're comfortable with. Back in June a buyer offered $22,000 and it expired before you saw it, so with offers on, the next one reaches you.",
          "Answer the title question and list what's included in the price (equipment, generator, permits)."
        ]
      }
    ]
  }
},
{
  "mode": "preview_html",
  "variant": "polish",
  "excludeUserIds": ["f2865e60-125e-4921-b7c5-898ba1675045"],
  "polish": {
    "hostId": "14242a2e-3e7f-4794-9aed-fa72a5bbf105",
    "featuredTrialOffer": false,
    "items": [
      {
        "listingId": "b8e79191-e69d-483c-bad1-8ebcfc6fb4b6",
        "suggestedTitle": null,
        "asks": [
          "Set the condition in the listing editor: New, Like new, Good, Fair or Needs work. Buyers who filter by condition can't see your truck until it's set.",
          "Add more photos. You have 3. At this price, buyers want the interior, the full kitchen line, the generator and the VIN plate.",
          "Add the build year and answer the title question so buyers can compare it with other trucks."
        ]
      }
    ]
  }
}
]
```

**Sending (once the owner approves).** Run each body separately in this order:

1. `preview_html`
2. `test`
3. `broadcast` with `"confirm": "2026-10-seller-concierge"`
