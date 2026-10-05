# Supply Desk

_Lead: Supply Desk (Claude) · reports to Growth & Liquidity · updated 2026-10-05_

| File | What |
|---|---|
| `01-draft-recovery.md` | Draft segmentation (102 real, shared definition), recovery sequence, yield |
| `02-density-plan.md` | Top 5 metros (LA, Houston, MSP, Atlanta, Raleigh–Durham), 60-day targets |
| `03-muse-prompts.md` | MUSE-2 (recruit sellers) and MUSE-4 (Wanted call-outs, now on Buyer Desk SB-1…7) |
| `04-listing-quality.md` + `04-listing-scores.csv` | Quality rubric, scores for all 130 real live listings, coaching copy, seed-listing cleanup |
| `05-offer-rescue.md` | Offer rescue loop (instant → 12 h → 36 h admin call) and response SLAs |
| `06-lovable-prompts.md` | LP-1 (shipped) and LP-2…LP-7, all payment-safe |
| `07-concierge-onboarding.md` | Owner's Studiotime concierge guide adapted: profile → list → optimize → share |
| `08-supply-to-demand.md` | Owner's 5-step supply → demand playbook applied: hero listings, quick wins, incentives, metrics |
| `outreach/` | Send-ready copy: 123 seller concierge emails, 2 real offer rescues |

## ⚠️ HOLD all seller outreach: ID-verification wall (found 2026-10-05)

Since **2026-10-05 00:10 UTC**, `signup_phone_policy.identity_enforced_from` has been set. `guard_signup_phone_actions` runs on INSERT/UPDATE of `listings`, `offers`, `conversations`, `conversation_messages`, `sale_transactions` and `booking_*`. It blocks any signed-in user who isn't a verified admin and has no `profiles.identity_verified`. It doesn't check when the account was created, so it applies to existing users too.

| Who | Blocked |
|---|---|
| Live sellers | **123 of 123** (phone and/or ID) |
| All accounts | 339 of 358 need ID verification |

What a blocked seller can't do:
- edit or publish a listing (including `/list/finish`, "turn on offers", adding photos)
- reply to a buyer
- accept, counter or decline an offer

In the app, every page outside `/dashboard` shows a full-page Plaid ID check. The dashboard shows a "locked" banner.

Every link in the concierge emails, draft reminders and offer rescues leads into this wall. **Don't send `outreach/` until the owner decides.** The options are in `09-verification-wall.md`.

## Shipped today (acting on findings)

_Deploy status (per Growth lead, 07:10 UTC): code is on the branch but **not live** until the coordinated publish and function deploy. Edge-function changes (draft-reminder pacing, boost-email length, 3-button offer email) are not deployed yet. Of these, only `admin-complimentary-boost-notify` is live. The 5 featured-trial sellers have received the official boost email._

| What | Where | Effect |
|---|---|---|
| Archived 14 seed listings with Unsplash photos (owner instruction) | Production data, status only, reversible | Live supply is **130 real** (121 sale / 9 rent), down from 144. Rollback SQL is in 04 |
| `/list/finish/:listingId`: one-screen Finish & publish | 87b59eea | Backlog drafts answer only the missing disclosures plus the attestations, then publish through the canonical publisher |
| **Offer responses restored** | 2c7ac9c0 | Sellers had no screen to accept, counter or decline offers. They now have /dashboard/offers, 3-button offer emails, and a home-page task. Fixed the infinite loop on legacy /dashboard?tab= links |
| Draft-reminder fix | 54e2d6c4 | Window 1–30 → 1–60 days. Spacing 2/7/14 days (was daily). Internal, QA and admin accounts skipped. Real title and name in the email. Links to the finish page |

## Owner decisions (2026-10-05)

1. **Concierge sender:** Brad, Customer Success. Applied to every outreach email.
2. **Referral program:** on. It was already enabled (`referral_program_enabled = true`); my earlier "waitlist" note was wrong. Payouts stay manual (`referral_auto_payout_enabled = false`), and the referral page now says so. Every concierge email ends with an accurate referral line ($150 after the referred seller's first transaction within 90 days, after review).
3. **Featured trial:** done. The 5 highest-traffic listings without a feature are featured free until **2026-10-19** (`featured_source = 'comp'`): Charlotte lemonade trailer, Lilburn rental, Boca Raton rental, Hiram truck, Stoughton Airstream. Their sellers' emails lead with the news (`featured_trial = yes` in the outreach CSV).
4. **Tucson "seller lead" (SB-6):** this was the owner's own test submission (owner email, June 12), not a real seller. No reply sent, and dropped from the briefs.
5. **Still open:** legal should confirm that draft reminders and offer alerts count as transactional SMS for the 18 opted-in hosts. The referral **terms** page still says "Payouts are batched weekly on Mondays"; it's legal text, so it was left for review.

## Payments

Square + PayPal, with PayPal **in sandbox. Do not change it** (environment, credentials, plans, webhooks). No Stripe, and no claims of automated payouts. Nothing shipped here touches payment code or settings.
