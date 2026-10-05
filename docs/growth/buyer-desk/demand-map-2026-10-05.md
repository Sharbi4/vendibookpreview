# Demand Map + Supply Desk Sourcing Briefs — 2026-10-05

**Inputs (30d):** `analytics_events` (`search_performed` 1,635 events, `search_zero_results` 321 events = 19.6%; the gap table below counts distinct sessions), `asset_requests` (all-time; only 3 since June), and clean human `listing_views` (753 sessions; scraper removed, see the hot-but-cold doc).
**Privacy:** street-address searches and requester names are left out on purpose.

## 1. Where buyers look vs. where supply sits (clean views)

| Category / price band | Clean sessions | Live listings | Sessions per listing | Read |
|---|---:|---:|---:|---|
| Trailer < $10k | 101 | 6 | **16.8** | Most under-supplied band |
| Trailer $10–20k | 123 | 17 | 7.2 | Healthy demand |
| Trailer $20–35k | 134 | 25 | 5.4 | Largest band by volume |
| Trailer $35–50k | 81 | 18 | 4.5 | |
| Trailer $50–80k | 43 | 13 | 3.3 | Over-supplied |
| Trailer $80k+ | 25 | 4 | 6.3 | Niche |
| Trailer rent | 94 | 9 | **10.4** | Under-supplied |
| Truck < $10k | 31 | 2 | **15.5** | Under-supplied |
| Truck $10–20k | 23 | 3 | 7.7 | |
| Truck $20–35k | 57 | 10 | 5.7 | |
| Truck $35–50k | 52 | 9 | 5.8 | |
| Truck $50–80k | 49 | 8 | 6.1 | |
| Truck $80k+ | 31 | 9 | 3.4 | Over-supplied |
| Truck rent | 15 | 4 | 3.8 | |
| Ghost kitchen rent | 17 | 6 | 2.8 | Thin demand on-site, but see zero results below |
| Vendor lot / vendor space | — | **0** | — | No supply at all |

**Summary:** demand concentrates under $35k (71% of sale-trailer sessions), and supply skews toward $35k+. The best sourcing targets are **trailers under $20k, trucks under $20k, and trailer rentals**.

States with the most clean sessions: TX 130 · FL 110 · CA 85 · GA 85 · NC 61 · AZ 47.

## 2. Zero-result searches (distinct sessions, 30d)

| Signal | Sessions | Supply today | Gap |
|---|---:|---|---|
| **Food trailer rent near ZIP 55303** (Anoka / Ramsey, MN; Twin Cities north metro) | **17** | 0 MN rentals; 1 MN sale (Ely, 4 hrs away) | Single biggest gap |
| Vendor space (any location, incl. San Carlos CA, Miami, LA) | 14 | 0 | Category has zero supply |
| Vendor lot (incl. Miami) | 13 | 0 | Category has zero supply |
| Ghost kitchen (LA, Houston, CO Springs 80939, any) | 10 sale+all, plus rent | 6 rentals, none in LA, Houston or CO | Metro gaps |
| Food truck **rent**, New York City | 3–4 | 0 NY rentals | NYC rentals |
| Food truck sale, Georgia / Florida / NC ZIPs | 2 each | GA has 1 truck for sale; FL 4 | Truck-for-sale gap in the Southeast |
| Food trailer sale, Houston (TX-99, Midtown) | 3 + 2 | 16 TX trailers, but radius misses | Probably a search-radius or geocode issue, not supply. Check with eng. |
| Food trailer, NJ / Ohio / NY Capital Region (12065) | 1–2 each | NJ 1, OH 1, NY 0 trailers | Northeast/Midwest trailer gap |
| Rentals, Las Vegas 89144 · Des Moines · Gainesville FL 32608 · Orange County 92627 | 1–2 each | Vegas has GK + truck only | Long-tail rental demand |

**Data-quality notes for Growth/eng:**
- About 20 zero-result events have an empty location and category "all" or "vendor_*", so the 19.6% zero-result rate is partly a vendor-category problem (no supply), not a matching problem.
- Partial location strings ("new", "new o") fire zero-result events while the user is still typing. Debounce before counting.
- Houston trailer searches return zero even though 16 TX trailers are live. Check the radius around Houston addresses.

## 3. Asset requests

Very little: 3 since June (2 Atlanta trailer rentals, one with a ≤$500 budget and a bakery/café concept on a 1–3 month timeline; 1 Tucson truck **seller** under $25k) plus 5 old rental requests from February with ZIPs in TN, SC, MN and OH. **None were matched** (`matched_listing_id` is null on all). Rex GA and Lilburn GA rentals fit the Atlanta requests. **Ops: reply to both Atlanta requesters with those 2 listings today.** The Tucson seller is a supply lead for Supply Desk.

## 4. Demand map: category × state × budget

| Priority | Category · mode | Where | Budget | Evidence |
|---|---|---|---|---|
| P1 | Food trailer · **rent** | MN (Twin Cities, ZIP 553xx) | $250–350/day, $1,200–1,600/wk | 17 zero-result sessions |
| P1 | Food trailer · sale | TX, FL, GA, NC, SC | **$5k–20k** | 16.8 and 7.2 sessions per listing in those bands; the top 4 hot-but-cold sale trailers are ≤$25k |
| P1 | Food trailer · rent | Atlanta metro, Houston | ~$300/day, monthly option | 2 asset requests; 94 sessions on 9 rentals |
| P2 | Vendor lot / vendor space · rent | Miami, LA, SF Peninsula (San Carlos), any | Monthly | 27 zero-result sessions; 0 supply |
| P2 | Ghost / commissary kitchen · rent | LA, Houston, Colorado Springs | $100–200/day, $2.5–3k/mo (Phoenix/Vegas comps) | 10+ zero-result sessions |
| P2 | Food truck · sale | GA, FL, NC | **<$20k and $20–35k** | 15.5 sessions per listing in trucks under $10k; Southeast zero results |
| P3 | Food truck · rent | NYC | Daily/weekly | 3–4 zero-result sessions |
| P3 | Coffee / beverage trailer · sale | CA, TX | $14–40k | Coffee comps get high clean views (SF, Placerville) |

## 5. Sourcing briefs for Supply Desk (paste-ready)

**SB-1 · Twin Cities trailer rentals.** Find 3 food trailers for rent within 40 miles of Anoka / Ramsey, MN (ZIP 55303). Target $250–350/day with weekly and monthly rates. 17 people searched this in 30 days and got nothing. Pitch to owners: "Your trailer sits idle in winter; renters are already searching for this on Vendibook." Ask for Instant Book, 8+ photos, and a monthly rate.

**SB-2 · Sub-$20k sale trailers in TX/FL/GA/NC/SC.** Recruit 10 listings in the $5k–20k band. This band gets 2–3x more views per listing than $50k+. Sources: FB Marketplace and FB-group sellers asking under $20k, and small builders with used trade-ins. Require condition, title status and operational status at listing time.

**SB-3 · Vendor lots and vendor spaces.** Seed the category with 5 listings in Miami, LA and the SF Peninsula. Targets: breweries, gas stations, church lots and flea markets that host trucks; monthly pricing. 27 zero-result sessions, no competition on-site.

**SB-4 · Commissary / ghost kitchens.** Add 1 each in LA, Houston and Colorado Springs, priced like the Phoenix/Vegas comps ($100/day, $2.7–2.8k/mo).

**SB-5 · Southeast trucks under $35k.** Find 5 trucks in GA, FL and NC. Require year, make, mileage and running status (a truck missing these, like Hiram GA, gets views and no contacts).

**SB-6 · Seller lead.** A Tucson, AZ truck owner (asset_request 2026-06-12, intent "sell", under $25k) never got a follow-up. Contact them through the request record.

**SB-7 · NYC truck rentals.** Low priority: 1–2 truck rentals in the NYC metro.
