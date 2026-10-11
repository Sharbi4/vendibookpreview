# Supply → Demand — owner's 5-step playbook applied to Vendibook

_Supply Desk · 2026-10-05 · source: the owner's "Supply-To-Demand Playbook & Checklist" (map supply, prioritise quick wins, align supplier incentives, track metrics, iterate)_

## Step 1 — Map the supply that already pulls demand

Ranked by real buyer interest: human view sessions in the last 30 days, scraper and self-views excluded.

| # | Listing | Where | Price | Sessions/30d | Gap |
|---|---|---|---|---|---|
| 1 | Custom 6'×12' pop-up lemonade concession trailer | Charlotte, NC | $5,900 | **46** | Offers off, 6 photos |
| 2 | 2026 fully loaded food trailer (rent) | Lilburn, GA | $350/day | 36 | Instant book off, 6 photos |
| 3 | 2024 food trailer for rent | Boca Raton, FL | $300/day | 25 | Only 3 photos |
| 4 | Fully equipped BBQ smoker | San Dimas, CA | $31,000 | 23 | Featured, offers on (the only featured listing) |
| 5 | Turnkey food truck | Hiram, GA | $30,000 | 18 | Offers off, no year/make/mileage (SB-5 calls this out) |
| 6 | 2025 Dreamfly Airstream | Stoughton, MA | $25,000 | 18 | — |
| 7 | Mailbox-style trailer | Lexington, KY | $8,500 | 16 | Offers off |
| 8 | 2023 SDG 37' commercial kitchen | Birch Run, MI | $118,500 | 15 | — |

**The pattern:** attention concentrates on **sub-$10k trailers** and **Southeast trailer rentals**, which matches Buyer Desk SB-2. These listings already pull buyers, but most have offers or instant book switched off and thin photo sets, so the demand doesn't turn into contacts.

## Step 2 — Quick wins (most impact for least effort)

| Tactic | Status today | Action | Owner |
|---|---|---|---|
| **Fix the hero listings** | 6 of the top 8 have offers or instant book off | Their sellers are first in `outreach/seller-concierge-2026-10-05.csv` (V3). Send those 8 by hand first | Ops / concierge |
| **Featured listings** | 1 featured listing on the whole site | Offer a complimentary 14-day feature to the top 5 hero listings once they fix their gaps. `admin-complimentary-boost-notify` already exists | Owner decision (admin action) |
| **Social sharing** | 12 `share_listing` events in 30 days; 0 shares on any top-12 listing | V4 email ("tag @vendibook"), MUSE-5 reshares, and a share prompt on the publish-success screen (ShareKit exists) | Concierge + Muse |
| **Reviews** | 9 ever, **0 in 90 days** | Ask for a review only after a completed sale or rental. Never solicit or fabricate reviews. Add a review request to the sale-complete email (LP-8 below) | Growth lead |
| **SEO** | Buyer SEO pages exist (`buyerSeoTracking`) | Hero listings in Charlotte, Atlanta and South Florida feed the city/category pages Buyer Desk is building | Buyer Desk |

## Step 3 — Align supplier incentives

| Incentive | Status today | Action |
|---|---|---|
| **Analytics insights** | `send-daily-digests` exists and the Growth lead just fixed its view counting (0a0741b9), but **it has no cron job**. `email_send_log` shows 0 digest emails in 30 days, so sellers never see their numbers | Schedule it (a cron row counts as a database change, so it's for the Growth lead). Suggested: weekly, Monday 14:00 UTC, sellers with a live listing only |
| **Referral bonus** | Supply referral program configured (`is_active`, $150, 7-day hold), with **360 codes issued and 0 referrals ever**. But `/referral` still shows a **waitlist** form ("we'll email when we open") | **Owner decision:** is the program open? If yes, remove the waitlist copy, and the concierge V4 email gets a "Know another owner selling? Refer them" line linking to /referral/terms. Rewards are reviewed and paid manually, so never describe payouts as automatic |
| **Marketing support** | The concierge (07), Muse reshares and featured offers above | Already in motion |

## Step 4 — Track the supply-driven metrics

Add these to the weekly scorecard. Each is computable today, except the UTM attribution (LP-4):

| Metric | Today (30d) | Source |
|---|---|---|
| Human view sessions on hero listings (top 20) | baseline from the table above | `listing_views`, scorecard exclusions |
| Seller storefront views | 524 | `analytics_events.profile_storefront_view` |
| Shares per live listing | 0.09 (12 / 130) | `share_listing` |
| Buyer contacts per 100 hero-listing sessions | ~0 | `conversations` + `offers` + leads |
| Offer response within 48 h | 0 of 2 real offers | `offers.responded_at` |
| Listings and contacts attributed to concierge / Muse | not yet measurable | needs LP-4 first-touch UTM |

## Step 5 — Iterate

Every Monday, re-score listings, rerun the hero map and drop tactics that didn't move contacts. Today's changes give us a clean before/after:

- the offer UI is back (2c7ac9c0)
- the finish page (87b59eea)
- spaced draft reminders (54e2d6c4)

Their effect should show up within 2–3 weeks.

## New spec

**LP-8 · Review request after a completed transaction.** In the existing sale-completed and rental-completed emails, add a "Leave a review" link for the buyer or renter, shown only when a completed `sale_transactions` or booking row exists for that pair. Use the existing `reviews` table and no incentives for reviews. No payment changes.
