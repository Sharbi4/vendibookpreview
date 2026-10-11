# Listing Quality — scores, top fixes, seller coaching

_Supply Desk · data pulled 2026-10-05 · per-listing scores: [`04-listing-scores.csv`](04-listing-scores.csv) (all 130 real live listings, worst first)_

## Headline finding: 14 of the 144 "live" listings are seed inventory

One account (`host_id fc7e755e…`, gmail, no business name, last active 2026-02-05) holds **14 live listings**, all published Jan 15–20:

- Spread across 8 states (AZ, CA, CO, FL, NM, NV, TX, WA).
- Generic showcase titles ("Premium Seafood Truck Empire", "Downtown Ghost Kitchen - Prime").
- Average price $59.5k.
- **Every photo is an Unsplash stock image.** These are the only stock-photo listings on the site.
- 0 offers, 0 conversations, 0 favourites, 0 walkthroughs, ever.

What this means:

- **Real supply is 130 listings, not 144.**
- A buyer who contacts one of these listings reaches nobody, which is a direct hit to the "seller responsiveness" and trust numbers.

**Done, 2026-10-05, on the owner's instruction ("remove the unsplash listings").**

- All 14 were set from `published` to **`archived`**: status change only, nothing deleted.
- Checked first: no listing triggers notify on archive, and none of the 14 were featured or promoted.
- Live count is now **130** (121 sale / 9 rent), and 0 Unsplash-image listings remain.

Rollback, if ever needed (owner approval required):

```sql
UPDATE listings SET status = 'published'
WHERE host_id = 'fc7e755e-d55e-4ef1-b58e-f1bfa37edf9f' AND status = 'archived'
  AND id IN ('171bf57c-6225-4188-819f-81d4230a9a17','66edfe50-f200-4560-832c-edc6877ad910',
  '33ee8fd3-f9fd-44b3-af28-64d94eb7f9e9','ee20ce79-1fbc-4885-aaf8-61f4c3a5cc25','a18288e0-872e-4024-adc5-eced6eee0e0a',
  'fec5ac8b-3e30-4500-b3c4-e95820aaa00e','1791e770-182f-4723-a207-59f727e8310e','d94836ba-10fa-44e0-8b5b-046b0bf7d01b',
  '0127af0e-0787-42eb-8fa8-256cdc6ae88d','e64d44fa-3d0d-46e6-9486-2411a2c5ff4d','fec458ae-0672-4073-ac92-c120de896c8a',
  'ddb8e4cb-3e16-482e-a9c5-845cd6068e4c','3d4b8b98-aec6-4bdd-9af8-d45470c091c7','2ee148f3-0b56-4739-86b1-b96208fcf1af');
```

The scores and CSV below cover the 130 real listings. The archived seed rows have been removed.

## Scoring rubric (100 points)

| Signal | Points | Rule |
|---|---|---|
| Photos | 25 | ≥8 = 25 · 5–7 = 15 · 3–4 = 5 · <3 = 0 |
| Price present | 15 | Sale price, or any rental rate |
| Offers / instant book | 15 | Sale: `accepts_offers`. Rent: `instant_book` |
| Title status | 10 | Sale trucks/trailers: `title_status` set. Rentals and ghost kitchens get it automatically |
| Condition | 10 | `condition` set |
| Walkaround video | 10 | `video_urls` not empty |
| Description | 5 | ≥300 characters |
| Year / make | 5 | _Scored N/A for everyone._ `year_built` / `make` are empty on all 144 listings, so the data is stored elsewhere (specs) and this check can't be trusted yet |
| What's included | 5 | `included_items` ≥3 characters |

**Price vs comps** is a flag, not points. `pricepilot_market_comparables` holds only 65 Facebook Marketplace *asking* prices (trailer median $11.5k, truck $19k), with no size or year normalisation. A listing is flagged "back up your price" only when it sits above **2× the category's 75th percentile**, and the coaching asks for justification (build year, equipment list). It never asks for a price cut.

## Results (130 real live listings, seed listings excluded)

| Band | Listings | Avg human view sessions / 30d* |
|---|---|---|
| A 80+ | 31 | 7.4 |
| B 60–79 | 54 | 6.6 |
| C 40–59 | 39 | 5.3 |
| D <40 | 6 | 7.3 (n too small to read) |
| **All** | **130** (avg score 65) | |

\* Scraper and self-views excluded, using the scorecard's definition. Across A, B and C, traffic rises with score. The D band is too small to say anything. This is correlation, not proof.

**How often each fix is needed (130 listings: 121 sale / 9 rent):**

| Fix | Listings | Note |
|---|---|---|
| Add walkaround video | 102 | |
| **Turn on offers** | **90 of 121 sale listings** | |
| Add photos (to 8+) | 55 | |
| Add condition | 47 | |
| List what's included | 47 | |
| Add title status | 40 | |
| Expand description | 35 | |
| Back up price vs comps | 35 | |
| Turn on instant book | 7 of 9 rentals | |

**Fix in this order.** Offers first (one toggle, and buyers at this price lead with offers), then photos, then condition, title and what's included (a 2-minute form), then video.

### Highest-traffic listings scoring under 60 (fix these first)

The `human_view_sessions_30d` column in the CSV is the sort key for ops. The top of that list:

| Score | Sessions/30d | Listing | Fixes |
|---|---|---|---|
| 50 | 46 | Custom 6'×12' Pop-Up Lemonade Concession Trailer, Charlotte NC | offers, photos 6→8, condition, title status, what's included |
| 25 | 15 | Food Trailer, Colleyville TX | offers, photos 3→8, condition, title, video, description, included |
| 40 | 15 | Coffee Trailer, San Francisco CA | offers, photos 7→8, condition, title, video, included |
| 60 | 15 | Fully loaded food trailer for rent, Rex GA | photos 5→8, condition, instant book, included |

## Coaching messages

Send one message per seller, never one per fix: a single email per seller (about 123 real sellers) listing their top 1–3 fixes, worst-scoring listing first. Each message links to the listing editor (`/edit-listing/{id}`). Field-level anchors don't exist yet; LP-5 adds them. Re-score weekly and only send again when the score hasn't moved in 14 days. Maximum one coaching email per seller every 14 days.

### C-1 "Turn on offers" (sale listings with offers off: 90)

**Subject:** Buyers can't make you an offer on your {title}

> Hi {first_name}, most buyers shopping {category}s in the {price_band} range start with an offer, not the asking price. Right now your listing doesn't accept offers, so those buyers move on. Turning offers on takes one tap, and you stay in control: every offer can be accepted, countered or declined, and you can set a minimum so lowballs never reach you.
> **[Turn on offers →]({edit_url})**

### C-2 "Add photos" (fewer than 8: 55)

**Subject:** {photo_count} photos → 8 makes your {title} easier to buy

> Buyers on Vendibook click listings with 8+ photos more often. Shots that answer the most questions: both sides and the back, the serving window, the full kitchen line, the hood and fire suppression tag, the generator, and the VIN or data plate. Phone photos in daylight are perfect.
> **[Add photos →]({edit_url})**

### C-3 "Answer the 3 buyer questions" (condition / title / included: up to 47)

**Subject:** 3 questions every buyer asks about your {title}

> Condition, title status, and what's included in the price. Answering them on the listing saves you the same three messages from every buyer and filters out tyre-kickers. It takes about 2 minutes.
> **[Answer now →]({edit_url})**

### C-4 "Back up your price" (flagged vs comps: 35)

**Subject:** Help buyers see why your {title} is worth {price}

> Comparable {category}s listed elsewhere are mostly in the {comp_p25}–{comp_p75} range. Yours is priced higher, which is fine if the build justifies it, but buyers need to see why. Add the build year, the equipment list with brands, and recent upgrades or inspections. If you're open to negotiation, turning on offers with a minimum is the easiest signal.
> **[Add details →]({edit_url})**

_Guardrail: never tell a seller they are "overpriced", and never quote comps when the category has fewer than 15 usable comparables._

### C-5 "Add a 60-second walkaround" (no video: 102)

**Subject:** A 60-second walkaround video answers 20 buyer questions

> Walk around the outside, open the serving window, pan the kitchen line, and start the generator. No editing needed, just upload from your phone.
> **[Add video →]({edit_url})**

### C-6 "Turn on instant book" (rentals: 7)

**Subject:** Renters book the listings they can reserve right away

> Instant book lets a renter reserve open dates without waiting for a reply. You still set your availability, minimum rental and deposit.
> **[Turn on instant book →]({edit_url})**

## What ships with this

- The CSV is the coaching worklist. Ops sends C-messages from it until the Growth lead's lifecycle email tool can read scores directly.
- The product side is LP-5 in `06-lovable-prompts.md`: a seller-facing "Listing health" card on the dashboard that uses this rubric.
