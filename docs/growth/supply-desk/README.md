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

## Shipped today (acting on findings)

| What | Where | Effect |
|---|---|---|
| Archived 14 seed listings with Unsplash photos (owner instruction) | Production data, status only, reversible | Live supply is **130 real** (121 sale / 9 rent), down from 144. Rollback SQL is in 04 |
| `/list/finish/:listingId`: one-screen Finish & publish | 87b59eea | Backlog drafts answer only the missing disclosures plus the attestations, then publish through the canonical publisher |
| Draft-reminder fix | 54e2d6c4 | Window 1–30 → 1–60 days. Spacing 2/7/14 days (was daily). Internal, QA and admin accounts skipped. Real title and name in the email. Links to the finish page |

## Needs an owner decision

1. **Concierge sender:** whose name signs the concierge emails (07)? The guide recommends a real person, ideally the founder.
2. **SB-6 lead:** a Tucson truck owner who asked to sell on 2026-06-12 (`asset_requests`) never got a follow-up. Ops should call them now.
3. **SMS:** legal should confirm draft reminders and offer alerts count as transactional for the 18 opted-in hosts.

## Payments

Square + PayPal, with PayPal **in sandbox. Do not change it** (environment, credentials, plans, webhooks). No Stripe, and no claims of automated payouts. Nothing shipped here touches payment code or settings.
