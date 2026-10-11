# Hot-but-Cold List — 2026-10-05

**Window:** last 30 days · **Source:** Lovable DB (`listing_views`, `conversations`, `offers`, `listing_leads`, `booking_requests`), read-only.
**Definition:** published, non-deleted listings ranked by distinct human view sessions with **zero** buyer contacts (conversation, offer, lead or booking request) in the window.

## Read this first: the baseline is wrong

The 4,842 "human" sessions in the baseline are mostly not human. After the standard bot-UA filter, two sources remain:

| Source | Sessions (30d) | Why it isn't a buyer |
|---|---:|---|
| One UA: `Windows NT 10.0 … Chrome/119.0.0.0` (a 2023 Chrome build) | **3,700** | Every view is a new session, 1 view per session, 0 logged-in users, a single referrer, traffic around the clock. It's a scraper. |
| One UA: `X11 Linux … Chrome/153` on the Glendale coffee trailer (`ce6ce158`) | **316** | `viewer_id` is the listing's own host. That's the seller refreshing their own listing. |
| **Clean human sessions** | **753** | Filter: bot regex, minus the scraper UA, minus host self-views |

- **Real Buyer Contact Rate = 6 / 753 ≈ 0.80%**, not 0.12%. The 1.5% target means **about 11 contacts per 30 days** at current traffic. That's +5, not +67.
- **Clean traffic is mostly mobile.** In the top 15, 44–87% of sessions come from phones. The raw data made it look like desktop because the scraper reports as desktop. That makes the mobile "Ask a question" fix the top lever.
- **Recommended for Growth lead:** report BCR on the clean definition (SQL at the bottom of this file), and have engineering drop that UA at insert time (see `lovable-prompts.md`, LP-5).

## Comps used

Medians of published sale listings: food trailers **$31k** (p25 $19k, p75 $49k); food trucks **$41.5k** (p25 $30k, p75 $75k). By type: coffee trailers median $40k ($14k–$45k); 8x16 / 16 ft trailers median $49.8k; beverage, ice and tap trailers median $25k; step-van trucks (Workhorse, P42, Freightliner) median $35k.

## Top 15

Sess = clean human sessions (30d). Mob = % of those on mobile. Contacts = 0 for all rows.

| # | Listing | Mode · Price | Sess | Mob | Diagnosis | Fix (owner: seller unless noted) |
|---|---|---|---:|---:|---|---|
| 1 | [Custom-Built 6'x12' Pop-Up Lemonade Trailer — Charlotte, NC](https://vendibook.com/listing/a3ead971-38c7-4c0c-8f3f-2b02185c7c2f) | Sale $5,900 | 46 | 77% | Most-viewed cold listing, and 25 of 46 sessions come from Google. Price is not the problem (bottom decile). Condition, title status and operational status are all blank. It's converted from a pop-up camper, so buyers' first question is whether it will pass health inspection, and nothing answers it. Offers are off. | Fill in condition, title and health-permit status. Turn on offers. Add a photo of the sink and water setup. **Best MUSE candidate** for event and lemonade-stand buyers. |
| 2 | [2024 Food Trailer for Rent (AS IS) — Boca Raton, FL](https://vendibook.com/listing/7757ad2a-dae9-4d1c-a9bf-68d703bb53ba) | Rent $300/day · $1,200/wk · $3,000/mo | 24 | 52% | Instant Book is on but nobody books. Two disclosed problems (the refrigeration and the prep-table fridge both need repair) at full price; GA competitors are fully working at $300–$350/day. Only 3 photos and a 227-character description. | Repair the fridges or drop to about $200/day "as-is". Add 8 or more photos. Lead with the hood system. |
| 3 | [Brand New 2025 Dreamfly Airstream — Stoughton, MA](https://vendibook.com/listing/587b1919-9828-46ef-bba8-76da9553f962) | Sale $25,000 (offers on) | 18 | 61% | Highest social pull in the set (7 social sessions). Dreamfly is an import brand, so buyers worry about VIN/DOT compliance, US-spec electrical and what's actually inside. The 275-character description has no equipment list. | Add a spec sheet: dimensions, VIN/title, electrical, included equipment, and whether NSF certification applies. Good MUSE-3 candidate. |
| 4 | [Turnkey Food Truck — Hiram, GA](https://vendibook.com/listing/c4113bc0-bd6e-41d5-bfd5-7eb135465c36) | Sale $30,000 | 18 | 44% | Priced at the truck p25 (a good deal), with 12 photos, a clean title and "runs/drives". But year, make, model and mileage are all blank, and those are the first things truck buyers filter on. Offers are off. | Add year, make, model and mileage. Turn on offers. Put the year in the title. |
| 5 | [Mailbox-Style Trailer — Lexington, KY](https://vendibook.com/listing/63f45b26-62bc-489e-a43f-8ae56f37217b) | Sale $8,500 (new) | 16 | 29% | 50 photos but only a 93-character description: no dimensions, no equipment and no use case. Marked negotiable but offers are off. | Write 5–8 lines on size, power, water and what's included. Turn on offers, since the seller already says "negotiable". |
| 6 | [Coffee Tailer — San Francisco, CA](https://vendibook.com/listing/a02adafe-ad00-40cb-90c7-2a8ccc55f469) | Sale $43,000 | 15 | 67% | **Wrong category:** it's an 8x10 trailer filed as `food_truck`, so it never shows up in trailer or coffee-trailer searches. The title has a typo ("Tailer"). Price is at the coffee median, and it includes an espresso machine, CA insignia and POS. Condition and title are blank. | Recategorize to food_trailer / coffee_beverage. Rename to "Turnkey 8x10 Coffee Trailer w/ Espresso + CA Insignia". (Ops can do this with seller consent.) |
| 7 | [Food Trailer — Colleyville, TX](https://vendibook.com/listing/cc3c8214-e327-4670-99ed-e1425494cc8c) | Sale $5,000 | 15 | 87% | Mostly social and mobile traffic (10 social sessions). Generic title, 3 photos, no condition or title. At $5k with no details it reads as either junk or a scam. | Add a specific title, 8+ photos (interior included), condition and title status. If it stays thin, keep it out of promotion. |
| 8 | [Modern Taco Trailer — Houston, TX](https://vendibook.com/listing/171bf57c-6225-4188-819f-81d4230a9a17) | Rent $275/day · $1,400/wk | 15 | 73% | Only 2 photos. Houston rental demand is real (zero-result searches for "Houston, TX" trailers), so the listing loses on trust, not price. | Add 8+ photos, list the equipment and add a monthly rate. |
| 9 | [2023 SDG 37' Commercial Kitchen — Birch Run, MI](https://vendibook.com/listing/f814bc22-d682-4ddf-818e-049472578f49) | Sale $118,500 (offers on) | 15 | 53% | Above the core budget. These buyers start from financing, and the page has no monthly-payment framing. The listing itself is strong (18 photos, clean title). | Add an "est. $/mo" line (see LP-4) and target the expanding-operator persona. |
| 10 | [Fully Loaded Food Trailer for Rent — Rex, GA](https://vendibook.com/listing/f13ba587-0d95-48f3-9a18-3bb92e540e05) | Rent $300/day · $1,600/wk | 15 | 47% | The Lilburn, GA rental ($350/day **plus a $5,000/mo rate**) got the conversation instead. Rex has no monthly rate and its weekly rate is higher ($1,600 vs $1,200). Condition is blank. Atlanta asset requests asked for rentals. | Add a monthly rate, bring the weekly rate to about $1,200, and set condition. |
| 11 | [2009 Workhorse Food Truck — Cottonwood Heights, UT](https://vendibook.com/listing/b6f99adb-53a4-4f02-90f8-cc66c87ad33b) | Sale $60,000 | 14 | 50% | **Price:** 71% above the step-van median ($35k). Operational status says "unknown", which is a red flag on a 2009 chassis. Offers are off. | Confirm running status. Turn on offers or price at $45–50k. |
| 12 | [2002 Workhorse P42 Diesel — Chambersburg, PA](https://vendibook.com/listing/dc2dd4ff-cc23-41a8-8a4f-4e496fc6ff62) | Sale $11,500 (offers on) | 14 | 64% | Cheap and runs, but only 3 photos and no interior or kitchen shots. Buyers can't tell whether it's a built kitchen or an empty van. | Add interior and equipment photos. State whether it's built out. |
| 13 | [Food Trailer — Frostproof, FL](https://vendibook.com/listing/acb2ab5c-afc8-45e1-96d0-45b9d6ca001a) | Sale $18,000 | 14 | 67% | Strong value: an 8x22 with hood, fire suppression, a flat-top and air fryers at about the trailer p25. The generic title hides all of that and the year (2000) isn't in the title fields. Offers are off. 0 search sessions, all social and direct. | Retitle as "8x22 Food Trailer w/ Hood + Fire Suppression – Self-Contained". Turn on offers. MUSE-3 candidate. |
| 14 | [Brand New Catering Trailer — Emeryville, CA](https://vendibook.com/listing/9ad68341-90d5-4dd7-b745-17041bdbc0c2) | Sale $18,000 | 13 | 64% | In CA the first question is "does it have an HCD insignia?" The listing doesn't say. The LA comp with an insignia asks $79k, so the answer drives the value. Offers are off. | State the insignia and permit status. Turn on offers. |
| 15 | [Like-New Compact Food Trailer — Aiken, SC](https://vendibook.com/listing/1707a6d0-76e7-4ad0-8a31-403b6a5b047e) | Sale $8,000 | 13 | 77% | Good photos (11), clean title, in the cheapest and busiest band. Offers are off, and mobile buyers have no low-commitment way to ask anything. | Turn on offers. Benefits most from the "Ask a question" sticky bar (LP-1). |

**Excluded on purpose:** the Glendale coffee trailer (`ce6ce158`) ranks #1 in raw data, but 316 of its sessions are the host viewing their own listing.

## Patterns across the 15

1. **Offers are off on 11 of the 15.** Sellers marked "negotiable" with offers off (KY) are the cheapest win. Ops can send a one-click "turn on offers" nudge.
2. **Trust fields are blank on 6 of the 15** (condition, title status, operational status). For $5k–$60k used equipment those are the buying questions. Required fields are in LP-3.
3. **Thin media or copy on 6 of the 15:** 4 listings have 3 or fewer photos, and 3 have descriptions under 300 characters.
4. **Price is the main blocker on only 2** (UT Workhorse; Boca rental "as-is").
5. **Clean traffic is 44–87% mobile.** The missing mobile "Ask a question" and the login wall hit every row.

## SQL — clean human sessions (reuse daily)

```sql
WITH hv AS (
  SELECT lv.* FROM listing_views lv JOIN listings l ON l.id = lv.listing_id
  WHERE lv.viewed_at > now() - interval '30 days'
    AND coalesce(lv.user_agent,'') <> ''
    AND lv.user_agent !~* '(bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|python|curl|wget|axios|node-fetch|go-http|java/|scrapy|semrush|ahrefs|whatsapp|telegram|discord|pingdom|uptime|monitor)'
    AND lv.user_agent <> 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    AND (lv.viewer_id IS NULL OR lv.viewer_id <> l.host_id)
)
SELECT count(DISTINCT session_id) FROM hv;
```
Note: logged-out host self-views (like the Linux Chrome/153 session on `ce6ce158`) slip past the `viewer_id` check. Exclude them per listing until LP-5 ships.
