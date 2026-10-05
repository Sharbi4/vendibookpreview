import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { renderBuyerSeoPage, isBuyerSeoPrerenderPath } from '../../../supabase/functions/_shared/buyerSeoPrerender';
import {
  BUYER_HUB_CONTENT, BUYER_SEO_PRERENDER_PATHS, USED_CONDITIONS, HOW_TO_BUY_TITLE, HOW_TO_BUY_FAQS, pricesTitle,
} from '../../../supabase/functions/_shared/buyerSeoContent';
import { prerenderTarget, BUYER_SEO_PATHS } from '../../../workers/seo-prerender-router';
import { CATEGORY_INDEX_CONFIGS } from '@/data/categoryIndexConfigs';
import { USED_CONDITION_VALUES } from '@/lib/listings/condition';
import { BUYER_SEO_PAGES } from '@/lib/buyerSeoTracking';
import { FINANCING_FAQ, FINANCING_TITLE, FINANCING_SECTIONS } from '../../../supabase/functions/_shared/financingContent';

describe('financing and AI search access', () => {
  it.each(['OAI-SearchBot/1.0', 'ChatGPT-User/1.0', 'PerplexityBot/1.0', 'Perplexity-User/1.0'])('serves public SEO pages to %s only', ua => {
    expect(prerenderTarget('/financing', ua)).toContain('path=%2Ffinancing');
    expect(prerenderTarget('/dashboard', ua)).toBeNull();
    expect(prerenderTarget('/checkout', ua)).toBeNull();
  });
  it('renders matching financing answers and valid WebPage/Breadcrumb JSON-LD without invented offers', () => {
    const result = renderBuyerSeoPage('/financing')!;
    const doc = new DOMParser().parseFromString(result.html, 'text/html');
    expect(result.indexable).toBe(true);
    expect(doc.title).toBe(FINANCING_TITLE);
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://vendibook.com/financing');
    for (const faq of FINANCING_FAQ) expect(doc.body.textContent).toContain(faq.a);
    for (const section of FINANCING_SECTIONS) expect(doc.body.textContent).toContain(section.text);
    const schemas = JSON.parse(doc.querySelector('script[type="application/ld+json"]')!.textContent!);
    expect(schemas.map((schema: Record<string, string>) => schema['@type'])).toEqual(['WebPage', 'BreadcrumbList']);
  });
});

const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const HUMAN = 'Mozilla/5.0 (Windows NT 10.0) Chrome/128 Safari/537.36';
const listing = (id: string, condition: string | null, title = `Truck ${id}`) =>
  ({ id, title, city: 'Austin', state: 'TX', price_sale: 45000, condition });
const one = (html: string, re: RegExp) => (html.match(re) || []).length;

describe('worker route selection', () => {
  it('routes crawlers on the 5 buyer paths, passes humans and variants through', () => {
    for (const p of BUYER_SEO_PRERENDER_PATHS) {
      expect(prerenderTarget(p, GOOGLEBOT)).toBe(`https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/seo-prerender?path=${encodeURIComponent(p)}`);
      expect(prerenderTarget(p, HUMAN)).toBeNull();
    }
    expect(prerenderTarget('/food-trucks-for-sale/', GOOGLEBOT)).toBeNull();
    expect(prerenderTarget('/food-trucks-for-rent', GOOGLEBOT)).toBeNull();
    expect(prerenderTarget('/blog/some-post', 'LinkedInBot/1.0')).not.toBeNull();
  });
  it('path lists agree across worker, function, tracking and sitemap', () => {
    expect([...BUYER_SEO_PATHS].sort()).toEqual([...BUYER_SEO_PRERENDER_PATHS].sort());
    // Tracking also covers specialty pages whose inventory uses the SPA renderer.
    for (const path of BUYER_SEO_PRERENDER_PATHS) expect(BUYER_SEO_PAGES).toContain(path);
    const xml = readFileSync(resolve('public/sitemap_pages.xml'), 'utf8');
    const gen = readFileSync(resolve('scripts/generate-sitemaps.ts'), 'utf8');
    for (const p of BUYER_SEO_PRERENDER_PATHS) {
      expect(xml).toContain(`<loc>https://vendibook.com${p}</loc>`);
      expect(gen).toContain(`"${p}"`);
    }
    // Generator must never overwrite the hand-maintained pages sitemap.
    expect(gen).not.toMatch(/writeFileSync\([^)]*sitemap_pages/);
  });
});

describe('shared content parity with the app', () => {
  it('CategoryIndex configs use the shared copy verbatim', () => {
    for (const [path, c] of Object.entries(BUYER_HUB_CONTENT)) {
      const cfg = CATEGORY_INDEX_CONFIGS.find((x) => x.path === path)!;
      expect(cfg.title).toBe(c.title);
      expect(cfg.h1).toBe(c.h1);
      expect(cfg.description).toBe(c.description);
      expect(cfg.faqs).toEqual(c.faqs);
      expect(cfg.sections).toEqual(c.sections);
    }
  });
  it('used conditions match the app predicate', () => {
    expect([...USED_CONDITIONS].sort()).toEqual([...USED_CONDITION_VALUES].sort());
  });
});

describe('rendered crawler HTML', () => {
  it('hub: accurate head, one H1, FAQs, schema, crawlable listing links, no redirect', () => {
    const r = renderBuyerSeoPage('/food-trucks-for-sale', { listings: [listing('a1', 'good'), listing('a2', 'new')] })!;
    const c = BUYER_HUB_CONTENT['/food-trucks-for-sale'];
    expect(r.status).toBe(200);
    expect(r.html).toContain(`<title>${c.title.replace(/&/g, '&amp;')}</title>`);
    expect(r.html).toContain('<link rel="canonical" href="https://vendibook.com/food-trucks-for-sale" />');
    expect(r.html).toContain('<meta property="og:url" content="https://vendibook.com/food-trucks-for-sale" />');
    expect(r.html).toContain('name="twitter:card"');
    expect(r.html).toContain('content="index, follow"');
    expect(one(r.html, /<h1>/g)).toBe(1);
    expect(r.html).toContain('href="https://vendibook.com/listing/a1"');
    expect(r.html).toContain('href="https://vendibook.com/listing/a2"');
    expect(r.html).toContain('"@type":"FAQPage"');
    expect(r.html).toContain('"@type":"BreadcrumbList"');
    expect(r.html).toContain('"@type":"ItemList"');
    for (const f of c.faqs) expect(r.html).toContain(f.q.replace(/'/g, '&#39;'));
    expect(r.html).not.toMatch(/location\.replace|http-equiv="refresh"/);
    expect(r.html).not.toMatch(/aggregateRating|escrow|verified seller/i);
  });
  it('used page never shows new or unknown-condition listings', () => {
    const r = renderBuyerSeoPage('/used-food-trucks-for-sale', {
      listings: [listing('u1', 'fair'), listing('n1', 'new'), listing('x1', null)],
    })!;
    expect(r.html).toContain('/listing/u1');
    expect(r.html).not.toContain('/listing/n1');
    expect(r.html).not.toContain('/listing/x1');
  });
  it('inventory error is truthful and stays indexable; genuinely empty is noindex', () => {
    const err = renderBuyerSeoPage('/food-trailers-for-sale', { inventoryError: true })!;
    expect(err.html).toContain("couldn't load listings right now");
    expect(err.html).toContain('content="index, follow"');
    expect(err.html).not.toContain('No listings are available');
    const empty = renderBuyerSeoPage('/food-trailers-for-sale', { listings: [] })!;
    expect(empty.indexable).toBe(false);
    expect(empty.html).toContain('content="noindex, follow"');
  });
  it('escapes listing titles in HTML and JSON-LD', () => {
    const r = renderBuyerSeoPage('/food-trucks-for-sale', { listings: [listing('z', 'good', '</script><img src=x onerror=alert(1)>')] })!;
    expect(r.html).not.toContain('<img src=x');
    expect(r.html).not.toMatch(/<\/script><img/);
  });
  it('guide and prices render shared copy', () => {
    const g = renderBuyerSeoPage('/how-to-buy-a-food-truck')!;
    expect(g.html).toContain(`<title>${HOW_TO_BUY_TITLE}</title>`);
    expect(g.html).toContain('"@type":"HowTo"');
    expect(g.html).toContain(HOW_TO_BUY_FAQS[0].question);
    const p = renderBuyerSeoPage('/food-truck-prices', { year: 2026 })!;
    expect(p.html).toContain(`<title>${pricesTitle(2026).replace(/&/g, '&amp;')}</title>`);
    expect(p.html).toContain('not completed sale prices');
    expect(isBuyerSeoPrerenderPath('/food-trucks-for-rent')).toBe(false);
    expect(renderBuyerSeoPage('/food-trucks-for-rent')).toBeNull();
  });
});
