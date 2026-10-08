# Trailer builder onboarding: 24 h check-in (2026-10-08)

**Status: STAGED. The owner approves the send.**

Host `1f790a1d…` is a metal-fabrication company (Mexican domain) that signed up as a host on 2026-10-07 at 00:24 UTC.
Do not contact `b50b38af…`: it is the duplicate signup with a typo'd domain, and mail to it bounced.

## What the data shows (read-only, 2026-10-08 00:41 UTC)

- **0 listings and no drafts.** The host hasn't signed in or been seen in the app since about 00:50 on Oct 7.
- **Phone still unverified.** They requested a code **3 times** (00:27, 00:30 and 00:50, all marked `sent`, all to a +1 number) but **never entered one**. Each challenge shows `attempts = 0`. That pattern means the text most likely never arrived.
- **Delivery isn't tracked.** `signup-phone-verification` writes nothing to `sms_message_log_v2` or `sms_send_log`, so we can't tell whether the carrier delivered or rejected the texts.
- **This is unusual.** Over the last 14 days, 38 of 39 members who requested a code verified. This host is the only one who never entered a code.
- **Likely cause:** the form only accepts US and Canadian numbers (`+1`, `reserve_signup_phone_code`). A Mexico-based builder with a +52 mobile can't verify at all. A +52 number typed as 10 digits would be sent to the wrong +1 number. Since **creating a listing needs a verified phone**, they're blocked from listing.

Telling them to "list your first trailer" would send them straight back into the same wall, so we don't send that. The helpful move is a short "having trouble verifying?" note. It's account help, so it goes out as a transactional email through `generic-notice` (VendibookEmailLayout), signed Brad.

## Staged email (`generic-notice` data)

```json
{
  "subject": "Need a hand finishing your Vendibook seller account?",
  "preview": "If your verification code didn't arrive, reply and we'll help.",
  "kicker": "Seller setup",
  "heading": "Let's get your first trailer listed",
  "greeting": "Hi {first_name},",
  "paragraphs": [
    "Thanks for signing up to sell on Vendibook. I noticed your account was set up, but the mobile verification step wasn't finished. That step is required before a first listing can go live.",
    "If the text with your code never arrived, just reply to this email and let me know. Verification currently works with US and Canadian mobile numbers, and if you're using a number from another country, tell me and I'll see what we can do.",
    "Once you're verified, listing a trailer takes about 10 minutes: your own photos, the build specs, condition (new units are welcome) and your location."
  ],
  "ctaLabel": "Finish setting up",
  "ctaUrl": "https://vendibook.com/list?utm_source=email&utm_medium=concierge&utm_campaign=builder-onboarding",
  "footnote": "Brad · Customer Success, Vendibook"
}
```

## Decisions for the owner (through the Growth lead)

1. **Send this help note?** It sends once, transactional, to `1f790a1d` only.
2. **Non-US/Canadian sellers.** Phone verification only accepts +1 numbers today, so a builder in Mexico can't list. Options:
   - allow +52, which needs SMS provider coverage and a cost check;
   - add an alternative verification path, such as identity verification instead of SMS;
   - have an admin verify the account manually after a call. That is a DB write through the Growth lead.
3. **Observability gap.** `signup-phone-verification` doesn't log carrier delivery status. Logging it to `sms_message_log_v2` would show failed deliveries instead of leaving us to guess.
