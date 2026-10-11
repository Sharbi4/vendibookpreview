# Initial markets and monitoring sources (2026-10-05)

Owner priority: real, quality sellers, listings and buyers, plus a safe site, come first. We pick markets where we can make a sale happen safely, not where volume is loudest.

## How markets were ranked

These are production numbers, read-only. They exclude internal accounts, the known scraper and sellers viewing their own listings.

| State | Live listings | Median sale price | Real view sessions (30d) | Location searches (60d) | Zero-result searches | Read |
|---|---|---|---|---|---|---|
| TX | 25 | $31.5k | 131 | Houston 28, Dallas 8, Texas 9, Austin 3 | Dallas 5 of 8 | **Wave 1.** Most supply and most demand. Dallas has demand but no local stock. |
| FL | 18 | $35k | 112 | Miami 3 | low | **Wave 1.** Second-deepest supply. |
| GA | 9 (2 rentals) | $25.3k | 85 | Atlanta 9, Georgia 7 | "Georgia" 7 of 7 (state-name parsing, now fixed) | **Wave 1.** Live buyer requests in Atlanta (rentals). |
| AZ | 9 | $34.8k | 47 | Tucson 9, Phoenix 9 | low | **Wave 1.** Home market; Brad and the owner can meet sellers in person. |
| CA | 8 | $35.5k | 87 | Los Angeles 18, San Carlos 5 | LA 9 of 18 | **Wave 2.** Demand is ahead of supply; recruit SoCal sellers first. |
| NC | 4 | $5.9k | 61 | Raleigh 5, NC 3 | Raleigh 5 of 5, NC 3 of 3 | **Wave 2.** Strong demand with almost no supply. Recruit sellers before buyers. |
| MN | 0 | — | — | 55303 (Anoka/Ramsey) 17, Minneapolis 4 | 21 of 21 | **Wave 2, supply-only.** Every search fails. |
| CO | 2 | $69k | 13 | Denver 10 | 3 | Watch list. |

Rules of thumb:
- **Wave 1 (now):** TX (Houston, then Dallas–Fort Worth, Austin, San Antonio), FL, Atlanta, Phoenix/Tucson. Run buyer *and* seller work here.
- **Wave 2 (supply first):** North Carolina (Raleigh, Charlotte), Twin Cities, Los Angeles. Recruit sellers only; don't send buyers to empty searches.
- Nowhere else until a market has 10+ quality live listings.

## Facebook groups

The owner shared 21 groups. Facebook is blocked from our cloud environment, and the numeric group IDs aren't indexed by search, so their names, size and rules can't be read from here. Score each group once, by hand, as a member:

| Score | Criterion |
|---|---|
| Market | 3 = a wave 1 city/state; 2 = wave 2; 1 = national; 0 = elsewhere |
| Fit | 3 = buy/sell trucks and trailers; 2 = operators' community; 1 = event/where-to-eat |
| Activity | 3 = 5+ buy/sell posts a day; 2 = weekly; 1 = rare |
| Rules | 3 = allows listings with links; 2 = allows posts, no links; 0 = no promotion (don't post; read only) |
| Safety | subtract 2 if scam posts go unmoderated (we can still help members, but never route buyers there) |

Work the top 6 first. The groups whose names are visible in the links:
- **Priority 1:** `houstonfoodtruck` (wave 1, highest search demand), `austinfoodtrucksgroup` (wave 1), `concessiontrailers` (national buy/sell fit; post our Texas, Florida, Georgia and Arizona listings there).
- **Priority 2:** `northcarolinafoodtrucksgroup`, for seller recruiting only until NC has stock.

How to work a group, without breaking its rules or Facebook's terms:
- Join as a real member: Muse, the owner or Brad, with an honest profile.
- Read the rules, and ask the admin before posting links.
- Help first:
  - answer questions about buying safely,
  - post scam warnings (stolen photos, deposit scams, "my shipper will pick it up"),
  - share price guides.
- Post a listing only when the group allows it, and only for real, verified inventory in that market.
- Never scrape groups, and never mass-DM members.
- Programmatic monitoring isn't available here: Meta retired the Facebook Groups API in 2024, and automated scraping breaks Facebook's terms. Group monitoring stays a human/Muse task, using Facebook's own group notifications.

## Sources that can be monitored automatically

All of these are blocked by the cloud environment's network policy today. To use them from a Claude session, add each domain under Allowed domains in the environment's network settings (https://code.claude.com/docs/en/cloud-environments#network-access), or run the monitor elsewhere. Check each site's terms before automating.

| Source | Use | Notes |
|---|---|---|
| Reddit r/foodtrucks (`https://www.reddit.com/r/foodtrucks/new/.rss`) | Buyer and seller questions | RSS and Reddit's API are the sanctioned ways in. Reply as a helpful member; no ads. |
| Craigslist saved searches ("food truck", "concession trailer") per wave 1 city | Sellers listing locally | Craigslist's terms prohibit robots and scraping. Use its own saved-search email alerts, on a logged-in account. |
| UsedVending.com state and category pages | Competitive price and inventory benchmark | Read their terms before any automation. Never copy listings. Invite sellers directly only through public business contact details. |
| Google Alerts ("food truck for sale" + city, "concession trailer for sale" + state) | Indexed posts across the web | Email or RSS delivery; fully compliant. |
| Vendibook's own signals (zero-result searches, asset requests, guest inquiries) | Demand we already have | Already in the hourly pulse. |

The hourly pulse uses web search over indexed public posts. That's the only external monitoring running today.
