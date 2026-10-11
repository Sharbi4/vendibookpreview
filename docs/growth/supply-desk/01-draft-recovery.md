# Draft Recovery — segmentation, sequence, yield

_Supply Desk · data pulled 2026-10-05 (read-only SELECTs on production) · code checked on `fix/paypal-webhook-config`_

## TL;DR

- **Definition (shared with the scorecard): real drafts = 102.** That is drafts excluding internal/test hosts (example.com, vendibook.com), admins, QA titles and every guest draft (`guest_draft_token` set). My first pass counted 108 because it kept 6 guest drafts that have no contact info, so they were unreachable anyway. Tables below are still on the 108 base; the reachable numbers are unchanged.
- **151 drafts, but only 108 (now 102) are real.** 43 are junk: 19 QA/internal drafts (`QA Cash Food Truck…`, hosts at `@example.com` / `@vendibook.com`) and 24 empty guest placeholders (`My Ghost Kitchen` / `My Food Truck`, created Jan 19–21, no photos and no price). Most of the 25 "Tucson" drafts are this junk. Exclude junk from every KPI. The Growth lead's draft count should read **108**.
- **No real draft can publish today without new answers.** On 2026-08-06 the wizard added a required disclosures step (`src/lib/listings/stages.ts → getStageRequirements`) plus 5 publish attestations. Required answers:
  - condition
  - operational status
  - title status and lien (titled sale assets)
  - known problems, or "none"
  - what's included
  - photo exclusions
  - attestations: ownership, accuracy, condition, marketplace rules, e-consent

  Across the 108:

  | Check | Count |
  |---|---|
  | Pass the old content checks (≥3 photos, price, title/description, full address) | 14 |
  | Pass the disclosures | 3 |
  | **Pass both** | **0** |
  | Missing "what's included" + photo-exclusions answer | 103 |
  | Missing condition | 89 |
  | Missing operational status | 90 |
  | Sale drafts with no title status | 83 |
  | **Started before the gate existed** | **74** |

- **The gate works for people who start fresh.** All 77 listings published since 2026-08-06 have disclosures filled in. The problem is the backlog: sellers who saved a draft in the old flow come back to six new questions they've never seen. Do not weaken the disclosures. They protect buyers on $10k–$80k deals. Make answering them a 60-second, one-screen task (**LP-1**).
- 112 of 151 drafts already got a `draft_nudge_sent_at` nudge. The cron (`send-draft-reminder`) only covered drafts 1–30 days old, re-nudged daily, and linked into the full wizard. **Fixed in 54e2d6c4:** 1–60 days, spacing of 2/7/14 days, internal and QA accounts skipped, and drafts with 3+ photos land on `/list/finish/:id`. Drafts older than 60 days are only reached by this sequence.
- **Expected yield with LP-1/LP-2 plus this sequence: about 20 new live listings (range 15–27) within 30 days,** +14% on 144 live.
- **Payments: no changes.** Square and PayPal stay exactly as configured, and PayPal stays in sandbox. Seller copy below doesn't promise any specific online checkout method.

## Segmentation (108 real drafts)

Tier rules (content only; every tier also needs the disclosure answers):

| Tier | Rule |
|---|---|
| A | ≥3 photos, price, city/state, real title |
| B | ≥1 photo and 2 of (price, location, title) |
| C | Some content |
| D | Empty shell |

| Tier | n | Sale / Rent | Trailer / Truck / GK | Host active ≤30d / 31–90d / 90d+ | Emailable* | SMS (txn opt-in) | Host already has a live listing | Main content gap | Sale $ listed (median) |
|---|---|---|---|---|---|---|---|---|---|
| **A: content-ready** | 18 | 12 / 6 | 10 / 4 / 4 | 3 / 10 / 5 | 15 | 5 | 3 | Disclosures only (plus <5 photos on 7) | $529k ($37.5k) |
| **B: near** | 25 | 24 / 1 | 17 / 6 / 2 | 3 / 4 / 17 (+1 guest) | 20 | 3 | 1 | Location (16), price (7) | $581k ($24k) |
| **C: partial** | 26 | 20 / 6 | 16 / 7 / 3 | 4 / 3 / 14 (+5 guest) | 17 | 2 | 4 | Title (18), location (15), price (14) | $251k |
| **D: shell** | 39 | 32 / 7 | 22 / 15 / 2 | 13 / 14 / 12 | 35 | 12 | 14 | Everything (0 photos, no price) | — |
| **Total** | **108** | 88 / 20 | 65 / 32 / 11 | 23 / 31 / 48 (+6 guest) | 87 | 22 | 22 | | **$1.38M** |

\* Emailable means the host has an account and is not in `email_unsubscribes` or `suppressed_emails`. 20 of 93 draft hosts are suppressed.

Other facts that shape the plan:

- **Age.** 19 drafts are ≤30 days old, 31 are 31–90 days, and 58 are 90+ days.
- **Contactability.** All 93 draft hosts have an email address. **0 hosts have SMS marketing opt-in.** 18 hosts (22 drafts) have *transactional* opt-in only.
- **Duplicates.** 17 drafts duplicate another draft's title from the same host, and 3 duplicate the host's own live listing. Collapse these and don't nudge them.
- **Photo-less drafts have a known cause.** There were 33 `vendi_media_upload_failed` events in the last 30 days, against 29 `vendi_published` in 90 days. Upload failure is a real reason drafts sit at 0 photos (**LP-3**).
- **Guest drafts.** The 6 real guest drafts have no contact info. They can only be recovered by a "resume your listing" banner keyed on `guest_draft_token`.
- **Concentration.** 5 hosts have 3 or more drafts (max 6). Ops calls them; no automation.

## Recovery sequence

**Precondition met:** `/list/finish/:listingId` shipped in 87b59eea (LP-1). Use `https://vendibook.com/list/finish/{listing_id}?utm_source=email&utm_medium=lifecycle&utm_campaign=draft-recovery-e1` as `{one_tap_url}`. Sign-in is required and returns the seller to the page. The LP-2 audience helper is still to build; until then, ops pulls the audience with the segmentation SQL.

Channel rules:

- **Email** to all 87 emailable drafts.
- **SMS** only to the 22 drafts whose host has transactional opt-in, worded as listing-status notices with STOP language. Legal should confirm these count as transactional.
- Stop the sequence when the draft publishes or the host replies.

| Day | Segment | Channel | Message |
|---|---|---|---|
| 0 | A + B (43) | Email | **E1 "6 quick answers and you're live"** |
| 2 | A + B with SMS ok (8) | SMS | **S1** |
| 5 | A + B + C (69) | Email | **E2 "Buyers are looking in {metro}"**, using only real metro data |
| 12 | A + B with sale price ≥ $20k | Email + ops call list | **E3 "Want us to finish it for you?"** (concierge; the seller still answers and attests the disclosures themselves) |
| 12 | C | Email | **E3c "A few things left"**, a checklist deep link |
| 21 | A–C still unpublished | Email | **E4 "Keep or archive?"** The draft is kept, never deleted |
| 3 and 14 | D, excluding hosts who already have a live listing (25) | Email | **D1 "Pick up where you left off"** and **D2 "List in 5 minutes with Vendi"** |
| — | D shells from live sellers (14) | None | Hide shells older than 60 days from the dashboard (UI setting, no data deletion) |
| — | 5 multi-draft hosts | Ops phone call | Help them bulk-publish |

### E1: "6 quick answers and you're live" (Tier A/B)

**Subject:** Your {title} is almost live
**Preheader:** We added buyer-protection questions. Takes about a minute.

> Hi {first_name},
>
> Since you started your **{title}** listing, we've added a short set of questions every seller answers before publishing: condition, whether it runs, title and lien status, any known issues, and what's included in the price. Buyers spending this kind of money ask these first, and listings that answer up front get fewer back-and-forth messages.
>
> {if A: "Everything else is done. Answer these on one screen and publish."} {if B: "After those, it just needs your {missing_1}{ and missing_2}."}
>
> **[Finish & publish →]({one_tap_url})**
>
> Listing on Vendibook is free.
>
> — {sender_name}, Vendibook seller team
> Reply to this email and a real person will help.

### S1 (transactional opt-in only, ≤160 chars)

> Vendibook: your {category} listing is saved. A few quick questions and it can go live: {short_url} Reply STOP to opt out.

### E2: "Buyers are looking in {metro}" (Tier A/B/C)

**Subject:** {N} people searched for {category}s near {metro} this month

> Hi {first_name}, buyers on Vendibook ran {N} searches around {metro} in the last 30 days, and right now there are only {live_count} listings there to show them. Your {title} would be one of the few.
>
> Two things make the biggest difference:
> 1. **8+ photos** (outside both sides, serving window, kitchen line, equipment plates). On Vendibook, buyers click listings with 8+ photos more often than ones with fewer.
> 2. **Turn on offers.** Most buyers at this price start with an offer.
>
> **[Finish & publish →]({one_tap_url})**

_Guardrail: `{N}` and `{live_count}` must come from the live query at send time. If N < 5, use the generic variant "Buyers are actively searching for {category}s", with no numbers._

### E3: concierge (A/B, sale ≥ $20k)

**Subject:** Want us to finish your listing for you?

> Reply with your photos (or an album link) and your asking price, and our team will build the listing. We'll send it back so you can answer the condition questions and approve it before anything goes live. No cost.

### E4: keep or archive

**Subject:** Should we keep your {title} draft?

> We'll keep your draft saved, but we'll stop reminding you after this. **[Finish & publish]({one_tap_url})** · **[I sold it / not selling]({archive_url})**

The "sold it" answer is a free supply-intel signal, so log it.

### D1 / D2: shells

- **D1 subject:** "Pick up where you left off on Vendibook". One sentence, then a deep link straight to the photo step.
- **D2 subject:** "Snap a few photos and Vendi writes the listing". This deep-links to Vendi quick-start, which already produced 29 publishes in 90 days.

## Yield estimate (30 days after LP-1/LP-2 ship)

| Tier | n (reachable) | Assumed publish rate | Expected new live listings |
|---|---|---|---|
| A | 18 (15 by email) | 40–55% (about 1 minute of answers) | **7–10** |
| B | 25 (20) | 25–35% | **6–8** |
| C | 26 (17) | 10–20% | **3–5** |
| D | 25 (excluding live-seller shells) | 5–10% | **1–3** |
| Guest | 6 | about 0 (banner only) | 0 |
| **Total** | | | **≈20 (15–27)** |

- That is about +14% live supply and about **$500k–$750k** of sale inventory.
- Without LP-1, using the existing nudge into the full wizard, expect 5 or fewer.
- Leading indicators, checked daily:
  - E1 open rate (target ≥45%).
  - Finish & publish page visits.
  - Disclosure completion rate on that page.
  - Publishes per day.
  - Drafts that open the page but abandon. Log which question they quit on.
