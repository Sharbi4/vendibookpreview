# Polish ask: 2016 Clark food trailer, Houston TX (2026-10-14)

**Status: STAGED. The owner approves sends.** Requested by the pulse at 02:25 UTC.

## What we found (read-only)

Listing `1c1d92fa-fd77-4d48-9dfe-e5348e19b672`, host `e3da22d5…`, edited at 01:25 UTC:

- **Two different prices.** The `price_sale` field is **$22,000**. The title ("FOR SALE: 2016 CLARK FOOD TRAILER – $20,000  Price: $20,000 Brand: Clark Year: 2") and the top of the description both say **$20,000**. Buyers see both numbers.
- The title is a pasted spec block, cut off mid-word.
- `make` is empty, although "Clark" is in the text.
- Condition is set (`good`). Year is 2016. 11 photos.
- **2 leftover empty drafts** from 2026-10-01 (`550aec57`, `f65b3cb7`).
  - The host got `listing-draft-nudge` on Oct 7 and was due another today, even though they've published.
  - **Fixed in 28285887:** draft reminders now skip hosts who published after their newest draft. This needs the `send-draft-reminder` redeploy.
- **Send checks:**
  - No campaign email in the last 14 days. The only recent email was the Oct 7 transactional draft nudge.
  - Not unsubscribed, not suppressed, and not on the do-not-contact list.
  - No ask staged before this one.

## What we ask, and what we don't

- We ask the seller to **confirm** the price. We never change it or guess which number is right.
- The suggested title uses only facts on record: brand, year, city. "Fully equipped" is not verified, so it's left out.
- No view counts.

```json
{
  "mode": "preview_html",
  "variant": "polish",
  "excludeUserIds": ["f2865e60-125e-4921-b7c5-898ba1675045"],
  "polish": {
    "hostId": "e3da22d5-4971-4490-86cb-f6864f2e8fa1",
    "featuredTrialOffer": false,
    "items": [
      {
        "listingId": "1c1d92fa-fd77-4d48-9dfe-e5348e19b672",
        "suggestedTitle": "2016 Clark Food Trailer, Houston TX",
        "asks": [
          "Confirm your price. The price on your listing is $22,000, but the title and description say $20,000, so buyers see two numbers. Update whichever one is out of date.",
          "Use a short title like the suggestion above, and put the price, brand (Clark) and year in the listing fields instead of the title.",
          "You also have 2 unfinished drafts from October 1. If you don't need them, delete them from your dashboard so they don't get mixed up with your live listing."
        ]
      }
    ]
  }
}
```

**To send, once the owner approves:** `preview_html` → `test` → `broadcast` with `"confirm": "2026-10-seller-concierge"` and the same `polish` object.
