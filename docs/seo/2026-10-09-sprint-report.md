# Vendibook SEO sprint — October 9, 2026

## Status and evidence

Implementation is committed and pushed to `fix/paypal-webhook-config`. A Git push does not prove the changes are deployed or indexed. No new production ranking improvement is claimed.

The objective is to move existing positions 11–30 onto page one while protecting current wins. A #1 ranking cannot be guaranteed. The supplied brief reports growth from 258 to 449 US keywords and estimated traffic from 14 to 57; those are user-provided period comparisons, not new measurements from this sprint.

Evidence files:
- [Semrush baseline](2026-10-09-semrush-baseline.json): fresh connected US top-50 organic sample and top-10 keyword-overlap competitors.
- [Public HTTP audit](2026-10-09-http-audit.json): nine live responses and robots.txt, before JavaScript rendering.
- [File and commit manifest](2026-10-09-change-manifest.json): every file touched by this task's selected commits; remote collaborators' unrelated commits are excluded.
- Existing technical audit: `docs/semrush-seo-audit-2026-10-04.json`.

Only the October 4 audit snapshot was returned by Semrush. API units ran out before new technical issue details could be retrieved. The brief's 45 errors, 42 warnings, 111 notices, 33 blocked URLs, 11 incorrect sitemap URLs and 27 slow pages are baselines to recheck, not resolved counts.

### Keywords to protect and improve

| Query | Observed position | Ranking page | Action |
|---|---:|---|---|
| sell my food truck / sell food truck | 5 | /sell-my-food-truck | Protect copy, title and URL |
| sell a food truck | 6 | /sell-my-food-truck | Protect |
| food truck for sale Atlanta | 6 | /buy/food-trailers/atlanta-ga | Preserve; clarify local trailer intent |
| food trucks for sale Atlanta | 10 | /food-trucks-for-sale/georgia | Preserve; strengthen statewide role |
| food trailers for rent | 8 and 11 in returned rows | /rent/food-trailers/houston-tx | Preserve; do not average duplicate rows |
| food truck for rent | 11 | /rent/food-trailers/houston-tx | Strengthen national rental hub without redirecting Houston |
| coffee truck for sale | 12 | /coffee-trucks-trailers-for-sale | Improve existing hub |
| used food trailers for sale in Georgia | 14, previous 35 | /food-trucks-for-sale/georgia | Protect momentum and add useful trailer links |
| coffee trailer | 16 | /coffee-trucks-trailers-for-sale | Keep one specialty hub |
| coffee cart for sale | 17 | /coffee-trucks-trailers-for-sale | Add compact-format buying guidance |
| Equinox Funding | 13 | /financing | Retain accurate partner disclosures |

The top-50 sample does not include every financing or coffee query from the supplied brief. Search volumes and ranks are Semrush estimates, not live personalized Google results.

## 1. Every file changed for this SEO sprint

| File | Change |
|---|---|
| src/pages/CategoryCityPage.tsx | Retryable inventory errors; correct collection canonical; Atlanta guidance; first image priority |
| src/pages/CategoryIndex.tsx | Comparable daily rental rate range; first image priority and dimensions |
| src/components/JsonLd.tsx | Collection ListItem references instead of invented product offers |
| src/components/FloatingConciergeButton.tsx | Load support form when opened |
| src/data/categoryIndexConfigs.ts | National rental cost, period, equipment and reservation guidance |
| src/data/cityCategoryConfigs.ts | Georgia intent links; replace unsupported state inventory assertions with inspection guidance |
| src/data/specialtyCategoryConfigs.ts | Coffee cart/van/espresso workflow guidance and contextual links |
| scripts/generate-sitemaps.ts | Public inventory filter, paging and canonical location generation |
| scripts/lib/sitemapLocations.ts | Valid category/city/mode routes and actual last modification dates |
| public/sitemap-listings.xml | Regenerated public listings |
| public/sitemap-locations.xml | Valid inventory-backed routes |
| public/sitemap_pages.xml | Remove legal URLs duplicated in dedicated legal sitemap |
| src/test/seo/cityInventoryFailure.test.tsx | Error state remains indexable and retryable |
| src/test/seo/semrushFixes.test.tsx | Collection references and existing canonical regressions |
| src/test/seo/sitemapLocations.test.ts | Route, mode, location and deduplication regressions |
| docs/seo/2026-10-09-http-audit.json | HTTP response evidence |
| docs/seo/2026-10-09-semrush-baseline.json | Keyword and competitor baseline |
| docs/seo/2026-10-09-change-manifest.json | Exact task commit/file inventory |
| docs/seo/2026-10-09-sprint-report.md | This report |
| docs/seo/2026-10-09-payment-follow-up.md | Separate earlier dashboard/payment request and deployment gaps |

Earlier commit `e359d1549`, already present on the branch, contains the absolute-canonical correction, PricePilot/PermitPath WebPage schema, buyer SEO tracking, market-snapshot/export work, and initial coffee improvements. Those were inspected and preserved; they are not represented as newly implemented here. The manifest records this separately.

## 2. Material page changes and individual audit decisions

| Page or group | Audit finding and outcome |
|---|---|
| /food-trucks-for-rent | Added full-period cost comparison and booking expectations; retained broad equipment-rental intent |
| /food-trailers-for-rent | Clarified terms depend on the listing; practical towing/equipment checks; retained trailer-specific intent |
| /coffee-trucks-trailers-for-sale | Added carts, vans, compact espresso layout, utilities and seller questions; existing new/used, equipment, finance, startup and seller journey retained |
| /food-trucks-for-sale/georgia | Statewide comparison guidance and links to Georgia/Atlanta trailers; no redirect |
| /food-trailers-for-sale/georgia | Replaced unsupported turnover claims with inspection, pickup and statewide search guidance |
| /buy/food-trailers/atlanta-ga | Added actual pickup location, inspection, transport-radius questions and statewide alternatives |
| /food-trailers-for-sale/texas | Replaced unsupported national inventory-superiority claim with statewide comparison and towing guidance |
| /food-trucks-for-sale/arizona and /food-trailers-for-sale/arizona | Replaced unmeasured inventory-concentration claims with cooling, power, condition and transport checks |
| /food-trucks-for-sale/florida and /food-trailers-for-sale/florida | Replaced unmeasured inventory-concentration claims with refrigeration, seals, corrosion, damage and transport checks |
| /rent/food-trailers/houston-tx | Ranking title, H1, URL and core local copy retained; shared city error/schema/image fixes apply |
| /used-food-trucks-for-sale | Existing dedicated condition filter and inspection content are appropriate; no new used inference or null-condition inclusion |
| /shared-kitchens | Existing commissary/rental intent, FAQs and links retained; template loading improvement applies; host/licensing wording warrants inventory-level verification before further copy claims |
| /pizza-trucks-trailers-for-sale | Already has specific oven, utility, transport and financing guidance; no filler added |
| /ice-cream-trucks-trailers-for-sale | Already has freezer/soft-serve, electrical and seasonal-operation guidance; no wholesale rewrite |
| /bbq-trucks-trailers-for-sale | Already has smoker, load, fire-suppression and maintenance guidance; no wholesale rewrite; unmeasured “most used” inventory wording is a follow-up verification item |
| /food-trucks-for-sale | Existing buying alternatives, inspection, used/new and state links retained |
| /food-trailers-for-sale | Existing trailer-focused inventory and buying guidance retained |
| /food-trucks-for-sale/texas | Strong existing ranking; title and body retained. State licensing effective July 1, 2026 checked against Texas DSHS; avoid implying all local operating obligations disappear |
| /food-trucks-for-sale/california | Existing statewide intent/template retained; no evidence supporting a risky rewrite |
| /financing | Existing calculator, budget-to-inventory links, application route and lender disclosures retained |
| /sell-my-food-truck | Existing PricePilot, pricing, listing creation and buyer-journey links already satisfy seller intent; no title/CTR experiment without Search Console data |

Inventory stays prominent. No new pages were created and no ranking URLs were merged or redirected.

## 3. Titles and descriptions

No ranking page titles, descriptions or H1s were changed in this sprint. The earlier shared SEO component fix ensures absolute canonicals are not prefixed twice. Existing title/meta accuracy must still be checked in rendered production HTML after deployment.

## 4. Structured data

Search/collection schema now describes real visible result references using ListItem name and URL. It no longer creates Product/Offer objects with guessed stock or a zero price. Empty results remain a CollectionPage. The list count matches the emitted, capped list. City collections use their actual canonical page URL.

PricePilot and PermitPath already use WebPage schema from the earlier correction, avoiding unsupported software-rich-result claims. No duplicate reviews or ratings were added. Product detail markup was not broadly rewritten.

This follows the distinction between individual product pages and result collections in [Google's product snippet guidance](https://developers.google.com/search/docs/appearance/structured-data/product-snippet) and the eligibility requirements for [software app results](https://developers.google.com/search/docs/appearance/structured-data/software-app). Valid markup alone does not guarantee a rich result.

## 5. Sitemaps

- Generated listing inventory is published, moderation-clear, not deleted, and not intentionally unlisted.
- Listing retrieval is paginated and ordered, avoiding a silent default row limit.
- The generated listing sitemap contained 137 public listing URLs at generation time.
- Location URLs use supported plural category slugs, known city/state combinations, and the listing's actual sale or rent mode.
- Location lastmod uses source update times rather than claiming all pages changed at generation time.
- Duplicate location URLs already present in the page sitemap are omitted.
- Ten duplicate legal/terms/privacy URLs were removed from sitemap_pages.xml; canonical legal entries remain in sitemap-legal.xml.
- A generation failure preserves previous files rather than replacing them with empty output.

Sitemap removal does not delete the corresponding page. Live inventory changes over time; verify regenerated output on the actual deployment.

## 6. Crawl and indexability

City inventory failure now shows an error and retry, stays indexable, and omits failed inventory from schema. It no longer treats a temporary query failure as confirmed empty stock. CategoryIndex's existing error behavior remains intact.

Ohio, Michigan, Miami, national rentals, Houston rentals, coffee, two legal pages and Why List returned HTTP 200 without an X-Robots-Tag in direct checks. robots.txt permits these public paths; private/auth/account/checkout routes remain disallowed.

**Unresolved production rendering issue:** all nine initial responses were the same general SPA shell, without a route canonical or H1 before JavaScript. This does not prove Google cannot render them. It does mean first-response HTML has not been verified as page-specific. The repo's prerender worker explicitly requires separate hosting deployment, and its current allowlist covers six buyer pages plus listings/blogs—not every rental, specialty or city page.

Before changing robots rules, inspect actual rendered URLs in Google Search Console and repeat the Semrush crawl with rendering enabled. [Google's robots guidance](https://developers.google.com/search/docs/crawling-indexing/robots/intro) explains that blocking crawling and excluding a URL from indexing are different controls.

## 7. Performance

The first inventory image now loads eagerly with high fetch priority, explicit dimensions and async decoding. Later cards stay lazy. The support form is split into a separate import and rendered only when opened.

The application build passed. Existing large-chunk, CSS syntax and font warnings remain; this sprint does not claim a measured Core Web Vitals improvement. Run comparable mobile Lighthouse tests and inspect field LCP/CLS/INP after deployment. Do not remove useful inventory or navigation to chase a score.

## 8. Internal links

Added or clarified:
- Georgia truck page → Georgia trailers and Atlanta-area trailers.
- Atlanta trailers → statewide Georgia trucks, statewide trailers and financing calculator.
- Coffee hub → PricePilot and Vendibook Freight.
- Existing rental national/local, shared-kitchen, financing, startup, PermitPath and buy-versus-rent relationships retained.

No keyword-stuffed footer block was added. Buyer SEO attribution continues through the established consent-gated first-touch tracking; downstream events are starts, never paid conversions.

## 9. Cannibalization

Houston currently ranks for broad rental queries as well as local ones. That is an observed query/page mismatch, not proof that it should lose its rankings. National hubs gained useful broad comparison content while Houston retained its URLs and core signals.

Georgia's statewide truck page and Atlanta's trailer page both rank for Atlanta truck variants. Their inventory types and geographic purposes are now clearer, with useful reciprocal links. No cross-canonical or redirect forces Google to choose a different winner.

Measure query-by-page clicks and total cluster traffic. A national page replacing Houston in a result is useful only if total relevant traffic and transaction starts improve without sacrificing local demand.

## 10. Intentionally unchanged

Protected seller page; Houston ranking copy/title; existing sale, used, pizza, BBQ, ice-cream and California content; financing underwriting disclosures; public/private route policy; used-condition semantics; analytics consent; checkout and fees within the SEO commits.

Payment changes are separate fixes to the earlier authorized dashboard/payment request, documented in the payment follow-up. SEO work did not reroute checkout funds or change fee rates.

## 11. Manual review and remaining work

1. **Production deployment:** confirm the hosting build uses the pushed branch. Git alone is not proof of rollout.
2. **Rendering:** inspect Google rendered HTML and hosting/prerender routing. Expand server-rendered coverage using the same inventory filters and page content when hosting access is available.
3. **Fresh Semrush crawl:** API units were exhausted. Repeat all original errors against deployed URLs; retain legitimate private exclusions.
4. **Search Console:** export query/page clicks, impressions and CTR before title experiments. No account data was available in this sprint.
5. **Inventory claims:** audit remaining inherited broad “verified,” “most used,” and availability claims against actual listing verification and live inventory. Do not convert seller declarations into platform guarantees.
6. **Performance:** measure after deployment; no before/after field-speed evidence is available.
7. **Authority:** obtain referring-domain detail for suspicious/unrelated links. No disavow, paid-link purchase or outreach was performed.
8. **Payments:** production functions/migration and completion-only settlement remain subject to the concrete limitations in the separate payment report.

### Competitor and authority priorities

The connected overlap report includes Rent2OwnTrailers (8 shared keywords, estimated 4,984 organic visits), ATX Food Trailers (8, 470), and Culinary Coachworks (9, 281). These are overlapping domains, not a verified ordering of the top Google result for every target query.

[UsedVending's coffee inventory](https://www.usedvending.com/used-mobile-food-trucks/coffee-beverage-truck/) illustrates the value of detailed listings, prices, location filters and transport information. Vendibook's best response is accurate inventory, useful comparison guidance, reliable buyer journeys and original market data. [Rent2OwnTrailers](https://www.rent2owntrailers.com/) has its own ownership product; Vendibook should not copy that claim without actually offering it.

Prioritize useful, relevant resources with culinary schools, community colleges, commissaries, manufacturers, food-truck associations, financing and logistics partners. The Campus Partner Program can earn a citation when the school's page serves its students. Publish genuinely supported market snapshots and inspection resources that partners can reference. Evaluate relevance and referral demand, not backlink count; no reciprocal-link quota.

Existing financing wording was checked against [Equinox's food truck financing resource](https://equinox-funding.com/how-to-finance-a-food-truck/). Texas licensing was checked against [Texas DSHS](https://www.dshs.texas.gov/retail-food-establishments/permits-retail-food-establishments/mobile-food-vendors).

## Next Semrush crawl: before / after checklist

Use the same US database, device/location settings and crawl scope for comparisons. Keep technical checks separate from ranking changes.

| Check | Before | After acceptance / record |
|---|---|---|
| Public crawl blocks | Brief: 33 blocked URLs, mixed private/public | Public published URLs render; intentional private exclusions remain |
| Sitemap errors | Brief: 11 | Record exact remaining URLs; canonical 200, indexable and unique entries only |
| Query failure | City failure could look empty | Simulated failed query shows retry, no automatic noindex |
| Structured data | Search/tool errors in brief | Valid rendered JSON-LD; no fabricated result-page offers or ratings |
| Initial HTML | Nine general SPA responses | Confirm route title/canonical/H1 and relevant content in rendered inspection; document any server-shell gap |
| Slow pages | Brief: 27 | Same mobile runs; record LCP/CLS/INP and transferred bytes |
| Text/HTML ratio | Brief: 39 | Verify useful content and visible inventory; do not use ratio alone as acceptance |
| Houston broad/local terms | #8/#11 and nearby variants | Preserve clicks and local relevance; inspect national hub movement |
| Coffee | truck #12, trailer #16, cart #17 | Record query/page rank, clicks, impressions and transaction starts |
| Georgia/Atlanta | #6, #10–13, used trailers #14 | Monitor both URLs and total cluster clicks |
| Seller acquisition | #5/#6 | Protect ranking and listing-start conversion |
| Financing | Branded query #13; longer-tail brief baselines | Track calculator use → inventory → application starts with correct attribution |
| Authority | Brief: score 7, about 555 referring domains | Review quality/relevance and genuine referrals; no quantity target |
| Conversion | Existing buyer_seo_* contract | Consent respected, one first-touch attribution, no duplicate paid conversion events |

Record technical results immediately after rollout. Review keyword and query/page movement over subsequent crawls and sufficient comparable traffic; an immediate recrawl is not evidence that ranking changes have settled.

## Verification

- SEO suite: 42 tests passed.
- New payout/refund policy and booking-specific queue tests: 31 passed.
- Earlier payment/dashboard verification: 48 passed.
- Application TypeScript check: passed after resolving test-only type/import issues.
- Vite development-mode build: passed; warnings described above.
- Narrow-screen signed-in payout preferences/form: visually checked in the built preview.
- Production deployment, live payment settlement, the SQL migration on production, and a fresh Semrush technical crawl: not verified.

