/**
 * Pure HTML renderer for buyer SEO pages (crawler first response).
 * No Deno/network APIs — the edge function fetches inventory and passes it in.
 * No redirect or meta refresh: the Worker serves this at the page's own URL,
 * so a redirect to the canonical would loop.
 */
import {
  BUYER_HUB_CONTENT, BUYER_HUB_INVENTORY, BUYER_SEO_PRERENDER_PATHS,
  HOW_TO_BUY_PATH, HOW_TO_BUY_TITLE, HOW_TO_BUY_DESCRIPTION, HOW_TO_BUY_H1, HOW_TO_BUY_STEPS,
  HOW_TO_BUY_FAQS, HOW_TO_BUY_QUICK_ANSWER, PRICES_PATH, pricesTitle, pricesDescription, pricesH1,
  PRICES_INTRO, PRICES_COST_HEADING, PRICES_FALLBACK_ANSWER, PRICES_SCOPE_NOTE, PRICES_COST_COMPONENTS,
  type SeoLink, type SeoFaq,
} from './buyerSeoContent.ts';

export const SITE = 'https://vendibook.com';

export interface PrerenderListing {
  id: string; title: string | null; city: string | null; state: string | null;
  price_sale: number | null; condition: string | null; cover_image_url?: string | null;
}
export interface RenderInput { listings?: PrerenderListing[]; inventoryError?: boolean; year?: number }
export interface RenderResult { status: number; html: string; indexable: boolean }

export const isBuyerSeoPrerenderPath = (p: string) => BUYER_SEO_PRERENDER_PATHS.includes(p);

const esc = (s: unknown) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const abs = (href: string) => (href.startsWith('http') ? href : `${SITE}${href}`);
const links = (ls?: SeoLink[]) => ls?.length ? `<ul>${ls.map((l) => `<li><a href="${esc(abs(l.href))}">${esc(l.label)}</a></li>`).join('')}</ul>` : '';
const faqHtml = (fs: SeoFaq[]) => fs.length ? `<section id="faq"><h2>Frequently asked questions</h2>${fs.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}</section>` : '';
const faqSchema = (fs: SeoFaq[]) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: fs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
const crumbs = (items: { name: string; href: string }[]) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(c.href) })),
});
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

function doc(o: { path: string; title: string; description: string; ogType: string; robots: string; schemas: unknown[]; body: string }) {
  const url = `${SITE}${o.path}`;
  // "<" is escaped in JSON-LD to prevent </script> breakouts from listing titles.
  const ld = JSON.stringify(o.schemas).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}" />
<meta name="robots" content="${o.robots}" />
<link rel="canonical" href="${url}" />
<meta property="og:type" content="${o.ogType}" />
<meta property="og:site_name" content="Vendibook" />
<meta property="og:title" content="${esc(o.title)}" />
<meta property="og:description" content="${esc(o.description)}" />
<meta property="og:url" content="${url}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(o.title)}" />
<meta name="twitter:description" content="${esc(o.description)}" />
<script type="application/ld+json">${ld}</script>
</head>
<body>
<nav aria-label="Breadcrumb"><a href="${SITE}/">Home</a></nav>
<main>
${o.body}
</main>
<footer><a href="${SITE}/food-trucks-for-sale">Food trucks for sale</a> · <a href="${SITE}/food-trailers-for-sale">Food trailers for sale</a> · <a href="${SITE}/used-food-trucks-for-sale">Used food trucks for sale</a> · <a href="${SITE}/how-to-buy-a-food-truck">How to buy a food truck</a> · <a href="${SITE}/food-truck-prices">Food truck prices</a></footer>
</body>
</html>`;
}

function renderHub(path: string, input: RenderInput): RenderResult {
  const c = BUYER_HUB_CONTENT[path];
  const listings = input.listings ?? [];
  const inv = BUYER_HUB_INVENTORY[path];
  // Defensive: never present a non-used listing on the used page.
  const shown = inv.conditions ? listings.filter((l) => !!l.condition && inv.conditions!.includes(l.condition)) : listings;
  // Mirrors CategoryIndex: transient error stays indexable; genuinely empty → noindex.
  const indexable = input.inventoryError || shown.length > 0;
  let inventory: string;
  if (input.inventoryError) {
    inventory = `<section id="listings"><p>We couldn't load listings right now. Please try again shortly.</p></section>`;
  } else if (!shown.length) {
    inventory = `<section id="listings"><p>No listings are available right now.</p></section>`;
  } else {
    inventory = `<section id="listings"><h2>${shown.length} ${esc(c.h1.toLowerCase())} available</h2><ul>${shown.map((l) => {
      const loc = [l.city, l.state].filter(Boolean).join(', ');
      return `<li><a href="${SITE}/listing/${esc(l.id)}">${esc(l.title || 'Listing')}</a>${loc ? ` — ${esc(loc)}` : ''}${l.price_sale ? ` — ${usd(Number(l.price_sale))}` : ''}</li>`;
    }).join('')}</ul></section>`;
  }
  const a = c.answerBlock;
  const answer = a ? `<section id="${esc(a.id)}"><h2>${esc(a.heading)}</h2><p>${esc(a.lead)}</p>${a.options.map((o) => `<h3>${esc(o.name)}</h3><p>Good for: ${esc(o.goodFor)}</p><p>Trade-offs: ${esc(o.tradeoffs)}</p>`).join('')}${a.footnote ? `<p>${esc(a.footnote)}</p>` : ''}${links(a.links)}</section>` : '';
  const sections = c.sections.map((s) => `<section><h2>${esc(s.heading)}</h2>${s.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}${links(s.links)}</section>`).join('\n');
  const trail = path === '/used-food-trucks-for-sale'
    ? [{ name: 'Home', href: '/' }, { name: 'Food Trucks for Sale', href: '/food-trucks-for-sale' }, { name: c.h1, href: path }]
    : [{ name: 'Home', href: '/' }, { name: c.h1, href: path }];
  const schemas: unknown[] = [crumbs(trail)];
  if (shown.length) schemas.push({
    '@context': 'https://schema.org', '@type': 'CollectionPage', name: c.h1, url: `${SITE}${path}`,
    mainEntity: { '@type': 'ItemList', numberOfItems: shown.length, itemListElement: shown.map((l, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/listing/${l.id}`, name: l.title })) },
  });
  if (c.faqs.length) schemas.push(faqSchema(c.faqs));
  const body = `<h1>${esc(c.h1)}</h1>\n<p>${esc(c.intro)}</p>\n${c.clarification ? `<p>${esc(c.clarification)}</p>` : ''}\n${inventory}\n${answer}\n${sections}\n${faqHtml(c.faqs)}`;
  return { status: 200, indexable, html: doc({ path, title: c.title, description: c.description, ogType: 'website', robots: indexable ? 'index, follow' : 'noindex, follow', schemas, body }) };
}

function renderGuide(): RenderResult {
  const faqs = HOW_TO_BUY_FAQS.map((f) => ({ q: f.question, a: f.answer }));
  const steps = HOW_TO_BUY_STEPS.map((s, i) => `<section id="${esc(s.id)}"><h2>Step ${i + 1}: ${esc(s.title)}</h2>${s.body.map((p) => `<p>${esc(p)}</p>`).join('')}${s.checklist?.length ? `<ul>${s.checklist.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}${links(s.links)}</section>`).join('\n');
  const toc = `<nav aria-label="In this guide"><ol>${HOW_TO_BUY_STEPS.map((s) => `<li><a href="#${esc(s.id)}">${esc(s.title)}</a></li>`).join('')}</ol></nav>`;
  const schemas = [
    crumbs([{ name: 'Home', href: '/' }, { name: 'Food Trucks for Sale', href: '/food-trucks-for-sale' }, { name: HOW_TO_BUY_H1, href: HOW_TO_BUY_PATH }]),
    { '@context': 'https://schema.org', '@type': 'HowTo', name: HOW_TO_BUY_H1, description: HOW_TO_BUY_DESCRIPTION,
      step: HOW_TO_BUY_STEPS.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.title, text: s.body.join(' '), url: `${SITE}${HOW_TO_BUY_PATH}#${s.id}` })) },
    faqSchema(faqs),
  ];
  const body = `<h1>${esc(HOW_TO_BUY_H1)}</h1>\n<p><strong>${esc(HOW_TO_BUY_QUICK_ANSWER.question)}</strong> ${esc(HOW_TO_BUY_QUICK_ANSWER.answer)}</p>\n${toc}\n${steps}\n${faqHtml(faqs)}`;
  return { status: 200, indexable: true, html: doc({ path: HOW_TO_BUY_PATH, title: HOW_TO_BUY_TITLE, description: HOW_TO_BUY_DESCRIPTION, ogType: 'article', robots: 'index, follow', schemas, body }) };
}

function renderPrices(year: number): RenderResult {
  const body = `<h1>${esc(pricesH1(year))}</h1>\n<p>${esc(PRICES_INTRO)}</p>\n<section id="cost-to-buy"><h2>${esc(PRICES_COST_HEADING)}</h2><p>${esc(PRICES_FALLBACK_ANSWER)}</p><p>Scope: ${esc(PRICES_SCOPE_NOTE)}</p><h3>What the total cost includes</h3><ul>${PRICES_COST_COMPONENTS.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>\n${links([{ href: '/food-trucks-for-sale', label: 'Food trucks for sale' }, { href: '/used-food-trucks-for-sale', label: 'Used food trucks for sale' }, { href: '/how-to-buy-a-food-truck', label: 'How to buy a food truck' }, { href: '/financing', label: 'Financing options' }])}`;
  const schemas = [crumbs([{ name: 'Home', href: '/' }, { name: 'Food Truck Prices', href: PRICES_PATH }])];
  return { status: 200, indexable: true, html: doc({ path: PRICES_PATH, title: pricesTitle(year), description: pricesDescription(year), ogType: 'article', robots: 'index, follow', schemas, body }) };
}

export function renderBuyerSeoPage(path: string, input: RenderInput = {}): RenderResult | null {
  if (!isBuyerSeoPrerenderPath(path)) return null;
  if (path === HOW_TO_BUY_PATH) return renderGuide();
  if (path === PRICES_PATH) return renderPrices(input.year ?? new Date().getFullYear());
  return renderHub(path, input);
}
