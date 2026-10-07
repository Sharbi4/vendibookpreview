# Polish ask: "Custom-Built 6' x 12' Pop-Up Lemonade Concession Trailer" (2026-10-07)

**Status: STAGED. The owner approves sends.** Requested by the 23:23 UTC pulse.

**⏳ Earliest send: 2026-10-12 07:10 UTC.** This listing is on the free 14-day feature, which runs until 2026-10-19. The host was sent the `complimentary-featured-boost` email on 2026-10-05 at 07:09 UTC. `send-seller-concierge` skips anyone who got that email in the last 7 days, so a send before Oct 12 07:09 reaches 0 recipients.

**Checked read-only:**
- **Listing** `a3ead971-38c7-4c0c-8f3f-2b02185c7c2f`: for sale in Charlotte, NC at $5,900, 6 photos. Edited at 23:01. `condition` is NULL.
- **Host** `bf4754c8…`:
  - no campaign email in the last 14 days;
  - not unsubscribed;
  - not on the do-not-contact list.
- **Host's other live listing** `24594068` ("Commissary Kitchen For Rent", Charlotte): condition NULL and no monthly rate. This host is one of the 4 monthly-rate asks in `11-rental-liquidity.md`. Folding that ask in here saves them a second email.
  - **If this email is sent, exclude `bf4754c8` from the `send-rent-while-you-sell` monthly_rate send.** Its 3-day cooldown would also skip them automatically.
- **Condition choices** match the listing editor: New, Like new, Good, Fair, Needs work. We ask; we never set it.
- No view counts in the email.

```json
{
  "mode": "preview_html",
  "variant": "polish",
  "excludeUserIds": ["f2865e60-125e-4921-b7c5-898ba1675045"],
  "polish": {
    "hostId": "bf4754c8-46ce-472e-8a71-2b8a7769a833",
    "featuredTrialOffer": false,
    "items": [
      {
        "listingId": "a3ead971-38c7-4c0c-8f3f-2b02185c7c2f",
        "suggestedTitle": null,
        "asks": [
          "Set the condition: New, Like new, Good, Fair or Needs work. Buyers who filter by condition can't see your listing until it's set, and it's featured right now, so this is a good week to finish it."
        ]
      },
      {
        "listingId": "24594068-25df-4bbe-b142-7bad96aacf39",
        "suggestedTitle": null,
        "asks": [
          "Add a monthly rate. Many renters want a kitchen for a month or a season, and without one they can't see what that would cost. Comparable kitchens on Vendibook list at $2,700–$2,800 a month."
        ]
      }
    ]
  }
}
```

**To send, once the owner approves and on or after 2026-10-12 07:10 UTC:**
1. `preview_html`
2. `test`
3. `broadcast` with `"confirm": "2026-10-seller-concierge"` and the same `polish` object.

Re-check the comps before sending; they come from live monthly rates as of 2026-10-06.
