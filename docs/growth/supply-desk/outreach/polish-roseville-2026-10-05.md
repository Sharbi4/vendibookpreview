# Polish review — new Roseville, CA host (2026-10-05)

Requested by the Growth pulse (23:22 UTC). New host `ef38dde4…`, identity-verified, account created today, 2 live listings. No profile photo.

Sent through `send-seller-concierge` with the new **`polish`** variant: the Resend marketing shell, signed Brad, with the referral and safety notes. All the usual skips still apply (unsubscribed, suppressed, admin, held, already sent this campaign). The run is limited to this one host.

## Checked against the live listing rows (corrections to the brief)

| Brief said | Data shows | Email asks |
|---|---|---|
| Sale title cut off ("…for sal") | The full title is stored: "Fully equipped spanking brand new food truck trailer for sale" | A cleaner title anyway |
| Ask for title status | `title_status = clean` and `has_lien = no` are already answered | Not asked |
| Ask for dimensions | Stored as 12 × 12 × 12 **inches** (placeholder values) | Fix the dimensions |
| Rental: 4 photos | Confirmed. The rental description also quotes a $60k purchase price | Keep the rental about renting; add 3+ photos |
| — | The address reads "123 Main St., Roseville", while the pickup note says Citrus Heights | Check the pickup address |

Nothing in the email asks for phone numbers or emails in the listing (the DB strips them automatically). The featured line is conditional: "reply and I'll check whether yours qualify". **Nothing is featured automatically.** If the owner approves, featuring is a separate data write.

## Request body (admin JWT or internal caller)

1. `mode: "preview_html"`: check the render.
2. `mode: "test"` + `testEmail`: send a proof.
3. `mode: "broadcast"` + `confirm: "2026-10-seller-concierge"`: send to the seller.

```json
{
  "mode": "preview_html",
  "variant": "polish",
  "polish": {
    "hostId": "ef38dde4-bc31-4be4-bae4-26c60d746ea6",
    "featuredTrialOffer": true,
    "items": [
      {
        "listingId": "c272f584-fda5-4403-952e-be7be00558a4",
        "suggestedTitle": "2026 New Food Trailer for Rent, Roseville CA",
        "asks": [
          "Keep this listing about the rental. Your sale listing already covers the purchase, so you can take the sale price out of this description and the title.",
          "Add at least 3 more photos: the interior cooking line, the fryers and grill, and the hitch with the generator cage. Renters want to see the kitchen before they book.",
          "Check the pickup address. It reads \"123 Main St., Roseville\" and your pickup note says Citrus Heights. Use the spot where renters actually pick up the trailer."
        ]
      },
      {
        "listingId": "eda6b136-304f-4b47-971d-96653a582093",
        "suggestedTitle": "2026 Fully Equipped New Food Trailer, Roseville CA",
        "asks": [
          "Fix the dimensions. They show 12 x 12 x 12 inches. Add the real length, width and height.",
          "Expand the description: who built it, a full equipment list with brands, and the 2026 inspection it passed.",
          "Add the VIN and any warranty from the builder. Buyers at this price ask for both.",
          "Add 2 more photos to reach 8, for example the interior line and the hitch or data plate."
        ]
      }
    ]
  }
}
```

Subject: "A few quick changes to help your listings get booked and sold". Each listing gets its own "Edit this listing" button (`/edit-listing/:id`, UTM `utm_content=polish_edit_cta`).
