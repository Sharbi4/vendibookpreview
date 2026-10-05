# ID-verification wall vs. closing sales — owner decision needed

_Supply Desk · 2026-10-05 · read-only findings; nothing changed_

## What's live

- `signup_phone_policy`: phone required since 2026-09-23 and **identity required since 2026-10-05 00:10 UTC**.
- `signup_identity_required(actor)` is true for every non-admin without `profiles.identity_verified`. It doesn't check the signup date.
- `guard_signup_phone_actions` runs BEFORE INSERT OR UPDATE on `listings`, `offers`, `conversations`, `conversation_messages`, `sale_transactions`, `booking_requests` and `booking_messages`. On UPDATE, the actor is whoever is signed in.
- UI (`PhoneVerificationPrompt` around the whole app): outside `/dashboard`, a signed-in unverified user sees a full-page phone or Plaid ID step. On `/dashboard` they see a "Messages and offers are locked" banner.

## Impact

| | Count |
|---|---|
| Live sellers blocked (phone or ID) | **123 / 123** |
| Accounts needing ID verification | 339 / 358 |
| Since 00:10: users active / verified / still walled | 5 / 2 / 2 |
| Since 00:10: listings published / messages sent | 0 / 0 |

A seller who hasn't verified can't:
- edit or publish a listing (including `/list/finish`, turning on offers, adding photos)
- reply to a buyer
- accept, counter or decline an offer, including through the new `/dashboard/offers`

Buyers also need ID verification before their first message or offer. That's the stated intent in AGENTS.md ("scam accounts must be verified before contacting members"), and the Oct 4 scam account shows why.

## Options (owner decides; schema/policy change → Growth lead builds)

1. **Keep the gate, scope it to contacting.** Require ID only for a buyer's *first* contact (new conversation or offer INSERT by the buyer). Let sellers update their own listings and respond to offers and messages on their own listings. This keeps the anti-scam protection, since scammers are the ones initiating contact, while sellers can still sell. **Recommended.**
2. **Grandfather existing accounts.** Apply ID verification only to accounts created after the enforcement date, and keep phone verification for everyone.
3. **Keep it as is, but go concierge.** Brad's emails explain the free 2-minute ID check first ("Verify once, then you can reply to buyers and edit your listing"). Expect heavy drop-off: 2 of 5 cleared it so far.

Until this is decided, the `outreach/` emails stay unsent.
