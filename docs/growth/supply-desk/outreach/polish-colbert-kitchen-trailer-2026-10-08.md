# Polish ask: "8x16 Kitchen trailer for sale" (2026-10-08)

**Status: STAGED. Sends need the owner's approval.** Requested by the 03:22 UTC pulse.

## Listing

`cbb5119a-c8f5-45fc-a357-b8e5c15f84d8`, host `398e66a8…`:
- For sale in Colbert, GA at $45,999.99, with 12 photos.
- Last edited at 02:40 UTC.
- `condition` is NULL.
- This is the host's only live listing.

## Send checks (all read-only)

The send is clear to go once approved:
- **Do-not-contact list:** not on it. The body still passes the list as `excludeUserIds`.
- **Unsubscribed or suppressed:** neither.
- **Campaign emails:** none in the last 14 days, so the concierge cooldowns don't apply.
- **Transactional emails:** none in the last 10 days, and no complimentary-featured-boost email, so the 7-day boost cooldown doesn't apply.
- **Featured:** no.

**Interaction with rent-while-you-sell.** This listing (a GA sale food trailer) may also be in that audience. If this polish email is sent first, the rent campaign's 3-day cooldown keeps the two emails apart.

## Content

- The seller sets the condition; we never set it for them.
- The choices match the listing editor: New, Like new, Good, Fair, Needs work.
- No view counts.

```json
{
  "mode": "preview_html",
  "variant": "polish",
  "excludeUserIds": ["f2865e60-125e-4921-b7c5-898ba1675045"],
  "polish": {
    "hostId": "398e66a8-04a9-4c70-b24d-e6736d619b29",
    "featuredTrialOffer": false,
    "items": [
      {
        "listingId": "cbb5119a-c8f5-45fc-a357-b8e5c15f84d8",
        "suggestedTitle": null,
        "asks": [
          "Set the condition: New, Like new, Good, Fair or Needs work. Buyers who filter by condition can't see your listing until it's set."
        ]
      }
    ]
  }
}
```

## To send, once the owner approves

1. Run `preview_html`.
2. Run `test`.
3. Run `broadcast` with `"confirm": "2026-10-seller-concierge"` and the same `polish` object.
