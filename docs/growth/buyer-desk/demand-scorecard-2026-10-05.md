# Demand Scorecard — 2026-10-05

Query: [`demand-scorecard.sql`](demand-scorecard.sql) (read-only; same view exclusions as `../liquidity-scorecard.sql`). Re-run daily; append a row below.

> **Correction (2026-10-05, after the scam account was suspended).** The first version of this page counted every contact. One scam account (`6f524614…`, now suspended, on a sending hold) made **4 of the 6 contacts in 30 days, and all 4 of the last 7 days'**. Excluding suspended accounts and accounts on a sending hold: **7d = 0 real contacts (0.00%), 30d = 2 (0.26%)**. The numbers below are corrected; the earlier "1.30% over 7d, close to target" was entirely that one account.

| Metric | 7d | 30d | Read |
|---|---:|---:|---|
| Real view sessions | 307 | 762 | ~44/day this week vs ~25/day over 30d: attention is growing |
| Mobile share | 67% | 52% | Mobile-first fixes (Ask button, verify-in-place) matter most |
| — from search (Google/Bing) | 39 | 134 | |
| — from social (FB/IG/Threads) | **90** | 105 | Social is 86% of its 30d volume in the last 7 days |
| — from AI assistants | 3 | 14 | |
| — direct | 79 | 305 | |
| Contacts, all accounts | 4 | 6 | |
| — from suspended/held accounts | **4** | **4** | One scam account on 2026-10-04 |
| **Real verified contacts** | **0** | **2** | |
| **Real verified BCR** | **0.00%** | **0.26%** | Not 1.30%/0.79%. The target is 5x further away than it looked |
| Guest inquiries (unverified) | 0 | 0 | The feature isn't published yet |
| Unique searches | 323 | 1,047 | Deduped per session+search |
| **Real zero-result rate** | **23.8%** | **24.9%** | Higher than the raw 19.6%: deduping removes repeat successful searches too. Dead ends are the biggest search leak. |
| Buyer concierge requests | 0 | 0 | The Tell Vendibook form isn't being used |
| Availability-alert signups | 0 | 2 | |
| Offers / response rate | 2 / 0% | 3 / 0% | Sellers don't respond to offers |

## Targets (30d, by 2026-11-04)
- Real verified BCR **≥ 1.5%** (about 11+ real contacts at current traffic, from a base of 2)
- Real zero-result rate **< 15%**
- Offer response rate **≥ 50%**
- Buyer concierge requests + alert signups **≥ 20/month** (requests now auto-include matched listings)

## Google Analytics 4 (30d, via Windsor)
- **"(direct) / (none)": 13,302 sessions, only 9.8% engaged.** Mostly the same scraper/bot traffic, which GA4 counts too. Read GA4 totals with this in mind.
- **Real acquisition:** Google organic 512 sessions (70% engaged), **ChatGPT 181 (75% engaged)**, Facebook about 232 (facebook.com + m./l./lm.), email 22, Bing 21, Reddit 8, Perplexity 3.
- **Attribution was broken:** GA4's "top sources" included `search_page`, `listing_price_line`, `home_hero` and `listing_card`. Those are our own event params named `source`, which GA4 reads as traffic-source overrides. Fixed in `1d3314c7` (sent as `ui_source`). Attribution by real channel is trustworthy from 2026-10-05.
- Funnel events (30d): search_performed 1,308 → listing_card_click 236 → listing_viewed 151 → generate_lead 48 / form_submit 42; financing_page_view 463, financing_apply_click 11.
- `ads_conversion_Checkout_1` is counted 124 times as a key event in 30d with 0 real checkouts in the DB. This Google Ads conversion fires on something other than a completed checkout, so Ads bidding is optimizing toward a false signal. **Payment-adjacent, so it's not changed here.** Flagged to the Growth lead.
