# Vendibook: focused SEO and AI search implementation

Research date: October 4, 2026. Implementation branch: `fix/paypal-webhook-config`.

## Evidence and priorities

The owner supplied Semrush AI Visibility 16, 35 mentions, 30 cited pages, Authority Score 7, 420 organic keywords and estimated organic traffic 41. These are third-party estimates and an owner-supplied baseline, not first-party visitor or conversion counts. The connected tool does not expose an AI Visibility report; these AI metrics were not independently refreshed.

Three bounded US reports consumed **900 reported Semrush API units**, with 45 rows total:

| Query | Rows | Reported units |
| --- | ---: | ---: |
| Vendibook organic positions, best positions first | 30 | 300 |
| Vendibook organic competitors | 5 | 500 |
| UsedVending keywords containing `financ` | 10 | 100 |

The Vendibook sample showed `sell food truck` at position 5, `food trucks for sale texas` at 9, `coffee truck for sale` at 12, `food trucks price` at 12 and `equinox funding` at 13. No clothing keywords appeared in this limited sample. The pasted shoe/dress topic widget is therefore excluded from recommendations; this is not a complete spam audit.

The competitor discovery sample listed onlyfoodtrucks.com, atxfoodtrailers.com, culinarycoachworks.com, awesomefoodtrailers.com and ranchotrailers.com. This is keyword overlap, not a comprehensive competitive market map. UsedVending was also examined because it appears in the owner's cited-source data. Its financing page already offers payment and meal calculators. A calculator alone is not a unique competitive advantage: Vendibook's useful addition is the direct connection between an entered purchase budget and filtered marketplace inventory, with explicit assumptions and operating-cost limitations.

## Shipped code changes

- Expand the existing canonical `/financing` hub rather than create keyword-variant pages.
- Build an accessible fixed-rate payment calculator, including zero-interest handling, valid-input boundaries, total repayment and gross-order planning. Default 10% is explicitly illustrative.
- Connect purchase budgets to existing sale-price search filters, carrying only sanitized campaign parameters.
- Add original buyer explanations, an application checklist, accessible FAQs, and contextual links to pricing, used inventory, specialty equipment, rental alternatives and existing state pages.
- Share financing copy between the React page and the prerender response. Add WebPage and BreadcrumbList structured data; do not emit financing FAQPage markup.
- Extend the existing crawler router to financing, OAI-SearchBot, ChatGPT-User, PerplexityBot and Perplexity-User. Keep private routes outside the router. Prevent downstream caching of crawler HTML as browser responses; preserve cached upstream prerender fetches.
- Fix `robots.txt`: all crawlers share the public/private rules, and `/list` no longer accidentally blocks `/listing/...` by prefix. Robots rules do not replace authentication.
- Correct unsupported blanket guarantees in the pre-existing `llms.txt`; add links to real buyer resources. This file is maintained for accuracy, not treated as a ranking mechanism.
- Add consent-gated financing interactions to buyer SEO tracking, preserve first-touch attribution for listing views, inquiries and checkout starts, and attach existing attribution to the existing signup event. Do not introduce paid-conversion events.

## Research sources

- [Semrush Vendibook organic positions](https://www.semrush.com/analytics/organic/positions/?q=vendibook.com&db=us)
- [Semrush Vendibook competitors](https://www.semrush.com/analytics/organic/competitors/?q=vendibook.com&db=us)
- [UsedVending financing page](https://www.usedvending.com/financing/): competitor functionality and buyer journey reviewed, not copied.
- [Mobile Food Alliance marketplace](https://mobilefoodalliance.com/marketplace/): marketplace positioning; no verified conversion comparison.
- [Google AI search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide): useful original content, crawlability, internal discovery and conventional SEO remain the foundation. No AI inclusion or ranking is guaranteed.
- [Google documentation updates](https://developers.google.com/search/updates): FAQ rich results were deprecated in May 2026; documentation removed in June.
- [OpenAI crawlers](https://developers.openai.com/api/docs/bots) and [Perplexity crawlers](https://docs.perplexity.ai/docs/resources/perplexity-crawlers): documented search/retrieval user agents.
- [Equinox food trailer financing](https://equinox-funding.com/food-trailer-financing/): provider context. Current eligibility and signed terms must be confirmed with the provider.

## Deployment and measurement

Live read-only check on October 4: an `OAI-SearchBot/1.0` request to `/financing` returned HTTP 200 with the generic home title and zero H1 elements. The live robots file still had `Disallow: /list`, which is a prefix rule and includes `/listing/...` for crawlers inheriting the wildcard group. These production observations confirm the deployment gap; the local fixes do not change those live responses until released.

Validation: 48 focused Vitest tests passed. Playwright passed at 1440, 768 and 390px, checking metadata, a single H1, zero-interest arithmetic, order estimates, UTM/budget URLs, actual search navigation, accordion behavior and the application dialog. No browser runtime errors or horizontal overflow were observed. No financing application was submitted.

The Vite production build and PWA packaging passed. Targeted ESLint passed. Existing large-chunk, Tailwind utility and external font warnings remain. A final repository-wide TypeScript rerun was stopped after several minutes without diagnostics; that final full-repository type check is unverified. No production deployment or Git push was performed. Existing unrelated local edits were preserved.

The frontend, `seo-prerender` Supabase function, and Cloudflare router are separate deployment surfaces. Repository changes alone do not activate a Worker route. Deploy the updated edge function before enabling its financing route. Follow `docs/seo-prerender-plan.md`; verify production response bodies with a browser UA and each search crawler UA, and inspect CDN/WAF access. Do not claim crawler delivery is active until verified live.

After deployment, compare 28-day windows for financing/pricing/coffee pages in Search Console: impressions, clicks, CTR and query positions. Review buyer SEO calculator-to-inventory, application clicks, listing views, inquiries and checkout starts, not just mention counts. Recheck the same Semrush AI prompt set and region for citation changes. Backend-confirmed transactions remain the source for paid outcomes.

Authority growth also requires real references: publish original marketplace data with sample size and asking-price limitations, and earn relevant partner/editorial mentions. Do not fabricate reviews, claims, expertise, competitor rankings, or backlinks. No outreach or paid link purchases were performed.
