# Welcome + polish: new seller, 2025 Paradise trailer, Ormond Beach FL (2026-10-14)

**Status: STAGED. The owner approves sends. Earliest send: 2026-10-15.** The host already got `welcome` (14:51) and `listing-published` (15:23) today.

Requested by the 16:50 UTC pulse.

## The seller and the listing (checked read-only)

**Host `ad118eac…`**
- Signed up 2026-10-14 at 14:51. Plaid identity verified at 14:54.
- Trust review by the Growth lead found no fake signals. The listing stays live under message-risk-scan.
- Send checks: no campaign email ever. Not unsubscribed, not suppressed, not on the do-not-contact list. No other staged ask.

**Listing `0621cf3c-9519-473b-b300-641bd0a0c953`**
- Published 15:23. "Never Used 2025 Paradise Food Truck", $69,900, 8 photos, condition `new`.
- Category is already `food_trailer`, so only the title is wrong. The city on the listing is **Ormond Beach**; the pulse said Daytona Beach.
- The description confirms "Professionally built by Paradise Food Truck in 2025, this 8.5' × 19' trailer".
- Formatting: 38 emoji and 64 markdown asterisks. A "📞 CONTACT OWNER: [owner's name] –" line remains after the number was stripped. The name is left out of this repo.

**Duplicate draft `e4055775-be8f-4593-a0b0-1b87cb73b09c`**
- Same text. Created 14:55, before the publish.
- With 28285887 deployed, draft reminders skip this host because they published after that draft.

## Email

We don't change anything ourselves. The intro is the neutral polish intro ("Thanks for listing with Vendibook…"). No view counts.

```json
{
  "mode": "preview_html",
  "variant": "polish",
  "excludeUserIds": ["f2865e60-125e-4921-b7c5-898ba1675045"],
  "polish": {
    "hostId": "ad118eac-f61c-45d0-99f3-62a5576af5c5",
    "featuredTrialOffer": false,
    "items": [
      {
        "listingId": "0621cf3c-9519-473b-b300-641bd0a0c953",
        "suggestedTitle": "Never-Used 2025 Paradise 8.5x19 Concession Trailer, Ormond Beach FL",
        "asks": [
          "Your title says food truck, but it's an 8.5' x 19' trailer. A title like the one above helps trailer buyers find it.",
          "Replace the \"CONTACT OWNER\" line in your description with \"Message me on Vendibook\". Phone numbers and emails are removed automatically, and buyers reach you through Vendibook messages.",
          "Use plain text in the description. Emoji and ** symbols don't display as formatting on Vendibook, so plain sentences read better.",
          "You also have an unfinished draft (\"2025 Never Used Food Trailer\") with the same details. If you don't need it, delete it from your dashboard."
        ]
      }
    ]
  }
}
```

**To send** (once approved, on or after 2026-10-15): run `preview_html`, then `test`, then `broadcast` with `"confirm": "2026-10-seller-concierge"` and the same `polish` object.
