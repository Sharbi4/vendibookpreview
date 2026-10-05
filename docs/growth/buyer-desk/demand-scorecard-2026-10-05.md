# Demand Scorecard — 2026-10-05

Query: [`demand-scorecard.sql`](demand-scorecard.sql) (read-only; same view exclusions as `../liquidity-scorecard.sql`). Re-run daily; append a row below.

| Metric | 7d | 30d | Read |
|---|---:|---:|---|
| Real view sessions | 307 | 762 | ~44/day this week vs ~25/day over 30d: attention is growing |
| Mobile share | 67% | 52% | Mobile-first fixes (Ask button, verify-in-place) matter most |
| — from search (Google/Bing) | 39 | 134 | |
| — from social (FB/IG/Threads) | **90** | 105 | Social is 86% of its 30d volume in the last 7 days |
| — from AI assistants | 3 | 14 | |
| — direct | 79 | 305 | |
| Verified contacts (conv + offer + booking) | 4 | 6 | |
| **Verified BCR** | **1.30%** | 0.79% | 7d is close to the 1.5% target |
| Guest inquiries (unverified) | 0 | 0 | The feature isn't published yet |
| Unique searches | 323 | 1,047 | Deduped per session+search |
| **Real zero-result rate** | **23.8%** | **24.9%** | Higher than the raw 19.6%: deduping removes repeat successful searches too. Dead ends are the biggest search leak. |
| Buyer concierge requests | 0 | 0 | The Tell Vendibook form isn't being used |
| Availability-alert signups | 0 | 2 | |
| Offers / response rate | 2 / 0% | 3 / 0% | Sellers don't respond to offers |

## Targets (30d, by 2026-11-04)
- Verified BCR **≥ 1.5%** (about 11+ verified contacts at current traffic)
- Real zero-result rate **< 15%**
- Offer response rate **≥ 50%**
- Buyer concierge requests + alert signups **≥ 20/month** (requests now auto-include matched listings)
