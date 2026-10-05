# Vendibook competitive search and AI discovery plan

Reviewed October 4, 2026. Evidence: `semrush-seo-audit-2026-10-04.json` and `semrush-growth-evidence-2026-10-04.json`. US Semrush estimates, not actual Search Console traffic or guaranteed outcomes. The Site Audit covers only 100 URLs; it is not a complete crawl. The keyword-gap endpoint rejected its parameters, so the opportunity assessment uses bounded organic, keyword overview and backlink reports instead of claiming a complete gap analysis.

## Decisions and changes shipped in this pass

- Fix malformed absolute canonical URLs in the shared SEO component, affecting legal and seller pages. Keep valid existing canonicals and landing-page routes.
- Give Contact its own metadata rather than the homepage description.
- Replace empty inventory ItemList markup with an honest CollectionPage; preserve real inventory Product/ItemList markup. Replace incomplete software-app rich-result markup on PermitPath and PricePilot with WebPage markup, without invented prices or reviews.
- Keep the last successful inventory sitemap when the inventory request fails; include only published, undeleted, moderation-cleared listings in the successful query.
- Strengthen the existing coffee hub with purchase costs, inspection/equipment considerations, financing and buying-guide links. Do not create another competing coffee hub or rewrite strong Texas pages.
- Add the three coffee buyer pages to consent-gated buyer SEO attribution.
- Make the existing food-truck asking-price report easier to cite: a CSV of aggregate statistics, source, snapshot time and scope. Suppress price statistics for groups below five listings. Do not export seller details or individual listing records. Do not present advertised prices as completed sale prices or a representative national estimate.
- Add verified Escoffier and Business News Daily opportunities; update Toast with a verified competitor-link target; put Mobile Cuisine on hold because its current homepage serves gambling content. No outreach was sent.

## Where competition is strongest

| Domain | Semrush Authority Score | Referring domains | Implication |
| --- | ---: | ---: | --- |
| vendibook.com | 7 | 191 | Relevant editorial references are a priority alongside technical fixes. |
| usedvending.com | 30 | 3,515 | Established authority; don't try to match raw backlink volume. |
| usedfoodtrucks.com | 34 | 887 | Its homepage states it joined forces with UsedVending; treat these as affiliated competitors. |
| onlyfoodtrucks.com | 7 | 273 | A closer authority comparison, although scores alone cannot predict rankings. |

UsedVending's food-truck and trailer head terms are much larger targets than the first-page opportunities below. Selling pages already rank around #5; preserve their intent and canonical URLs. Coffee truck for sale ranks around #12, food truck price around #12, and food truck for rent around #11. These are bounded Semrush observations, not a full domain ranking inventory. Check location, date and device consistently when comparing them later.

## Topic priorities: improve existing assets before adding pages

Search volume and difficulty below come from the same keyword-overview pull. Volumes overlap; never sum them into a traffic forecast.

| Priority | Query | US monthly volume / KD | Target and work |
| --- | --- | --- | --- |
| 1 | coffee trailer for sale | 2,400 / 17 | Existing coffee trailer page and coffee hub. Hub purchase guidance improved now. Next add authentic equipment fields/photos to qualifying listings and strengthen links between hub and vehicle pages. |
| 1 | food truck financing | 1,600 / 29 | `/financing`; retain the calculator and clear provider disclosures. Refresh terms only with lender evidence. Include food trailer financing (390 / 12) on this asset rather than a near-duplicate page. |
| 1 | food truck rental | 5,400 / 18 | `/food-trucks-for-rent` and real inventory city pages. Semrush currently associates one rent term with the Houston food-trailer page: inspect query-to-page performance in Search Console before changing titles or redirects. Preserve rental vs catering distinction. |
| 1 | used food trucks for sale | 6,600 / 32 | Existing used inventory page. Eligibility must use seller-declared condition; NULL is excluded. Add real inventory and condition details, not keyword guesses. |
| 2 | food truck startup costs | 720 / 20 | Existing `/tools/food-truck-startup-costs-2026`, startup guide and `/food-truck-prices`. Keep guide vs market-report roles distinct; add dated, source-qualified costs rather than generic copied ranges. |
| 2 | food truck inspection | 210 / 12 | Existing `/guides/meetup-inspection` and buying guide. A downloadable checklist can serve buyers and editorial citations. Add named inspector input only after actual review. |
| 2 | food truck commissary | 1,300 / 19 | Existing `/help/commissary-requirements`. Confirm licensing guidance against actual city/county sources before strengthening it; do not imply a shared-kitchen listing is automatically an approved commissary. |
| 3 | food truck vs trailer | 110 / 1 | Buying guide comparison section first. Standalone page only if query evidence shows unmet intent and enough original comparison content exists. |
| Research | rent to own food truck | 210 / 20 | Publish only if Vendibook/provider actually supports a documented product. Do not suggest leases or financing are rent-to-own. |

No blanket city/state rollout. Add a local landing page only with useful local inventory, unique buying information and an indexable error state. Investigate the user's reported Texas impression decline using comparable Search Console periods, query mix and seasonality; the notification alone does not prove a ranking decline.

## AI search: highest unresolved dependency

The current raw web fetch returned the generic SPA shell for the coffee and Texas pages. This is an observable fetch limitation, not proof that Google cannot render the pages. The repository has a Supabase SEO renderer and Cloudflare routing Worker, but Cloudflare domain routes remain commented out. A Lovable frontend publish alone does not activate this routing.

1. Confirm domain ownership, Cloudflare zone/proxy and current Supabase renderer deployment before modifying production routing. No Cloudflare connector was available in this session; this dependency remains unresolved.
2. Verify 200 responses and useful initial HTML for Googlebot, Bingbot, OAI-SearchBot and PerplexityBot on a listing, buyer hub, pricing page and financing page. Compare meaningful text, inventory eligibility, canonical, status and schema with the human-rendered page. Don't serve bots misleading information.
3. Preserve noindex/private routes, consent requirements and auth protections. Inventory fetch failures must remain honest errors, not empty inventory claims. Test robots.txt and CDN/WAF behavior separately from browser rendering.
4. Expand crawler-rendered routes to coffee pages and the existing pricing report only after content parity is implemented and tested. Do not add paths to the Worker before the renderer supports them.
5. Submit updated sitemaps through an authorized Search Console/Bing session when available. This session did not submit them or request indexing.

Google's [AI search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) emphasizes normal search eligibility and useful original content. A special AI text file or extra schema does not guarantee an AI citation. Prioritize accessible answers, truthful inventory, original charts and citations that other authors actually use.

## Verified editorial targets and pitch drafts

Semrush identifies existing competitor links on the following pages; the articles were also opened for relevance. Inclusion is editorially controlled. Verify the editor/contact through the publication itself before sending; no contact addresses have been guessed.

### Escoffier

Source: [How to buy a food truck](https://www.escoffier.edu/blog/food-entrepreneurship/how-to-buy-a-food-truck/) links to UsedVending, as does its starting-your-own-food-truck article. Offer the buyer guide plus dated marketplace evidence rather than requesting competitor removal.

Draft: “Your food-truck buying guide walks readers through choosing equipment. Vendibook has a live asking-price report with a dated aggregate CSV, sample sizes and clear limitations, plus a practical buying guide. Would that be useful as an additional student resource? These are advertised marketplace prices, not completed sales or a national estimate: https://vendibook.com/food-truck-prices.”

### Business News Daily

Source: [How to start a food truck business](https://www.businessnewsdaily.com/9237-how-to-start-food-truck-business.html) links to UsedVending. Pitch a sourced equipment-cost update with a separate startup-budget explanation.

Draft: “For a future update to your food-truck startup guide, Vendibook offers a dated equipment asking-price summary with downloadable aggregates and transparent methodology. It could supplement the startup-budget discussion without treating asking prices as final transaction values. The report and source are here: https://vendibook.com/food-truck-prices. Happy to explain the exclusions and sample sizes if useful.”

### Toast

Source: [Selling a food truck](https://pos.toasttab.com/blog/on-the-line/selling-a-food-truck) links to UsedFoodTrucks. Pitch evidence for setting expectations, not a claimed automatic valuation.

Draft: “Your selling-a-food-truck guide could benefit from a current reference on advertised marketplace prices. Vendibook publishes a dated aggregate summary and CSV with sample sizes and a clear distinction between asking prices and actual sales. Would this be a useful supporting reference for readers researching their asking price? https://vendibook.com/food-truck-prices.”

Food Truck Operator is a relevant additional editorial target, but a competitor link was not confirmed in this pull. Shopify's sampled competitor links concerned vending machines, so those aren't evidence of a food-truck opportunity. Square's sampled link was Canadian and marked lost, so don't call it a verified active US competitor link. Avoid paid link schemes, guaranteed-link packages and irrelevant directory volume.

## 30 / 60 / 90-day execution and measurement

- First 30 days: ship these fixes; resolve crawler routing access; verify initial HTML; compare Search Console query/page pairs; secure permission for real operator examples; prepare editorial outreach using the report. Re-run the capped audit after deployment rather than claiming its old 87/100 score improved already.
- Days 31–60: refresh existing financing, rental and inspection resources from actual evidence; pitch the verified editorial targets after sending is authorized; record earned links and referral traffic; add genuinely useful internal links and reviewed operator case studies.
- Days 61–90: use Search Console and buyer SEO attribution to choose further topics. Expand only assets with clear unmet intent, real inventory or original evidence; strengthen the citation asset with historical snapshots only once those snapshots have actually been collected.

Measure: indexable canonical URLs, technical issues on a fresh audit, query-specific position/CTR/impressions, relevant earned referring domains, qualified organic listing views, and booking/checkout starts. Buyer SEO downstream events are starts, never paid conversions. Track AI mentions with a repeatable prompt set and recorded sources; do not equate occasional citations with broad ranking leadership.

The aim is durable growth in relevant search results and transactions. Neither a Semrush score nor this work can ensure #1 placement across competitors; ranking depends on query, geography, inventory, competitors and search engines.
