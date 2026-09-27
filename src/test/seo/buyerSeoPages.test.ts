import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { CATEGORY_INDEX_CONFIGS } from '@/data/categoryIndexConfigs';
import { USED_CONDITION_VALUES, isUsedCondition } from '@/lib/listings/condition';
import { HOW_TO_BUY_PATH, HOW_TO_BUY_TITLE, HOW_TO_BUY_DESCRIPTION, HOW_TO_BUY_FAQS, HOW_TO_BUY_STEPS } from '@/pages/seo/HowToBuyAFoodTruck';

const root = resolve(__dirname, '../../..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');
const cfg = (path: string) => CATEGORY_INDEX_CONFIGS.find((c) => c.path === path)!;

describe('buyer SEO pages', () => {
  it('preserves existing sale hub URL, H1 and title', () => {
    expect(cfg('/food-trucks-for-sale').h1).toBe('Food Trucks for Sale');
    expect(cfg('/food-trucks-for-sale').title).toBe('Food Trucks for Sale | Used & New | Vendibook');
    expect(cfg('/food-trailers-for-sale').h1).toBe('Food Trailers for Sale');
    expect(cfg('/food-trailers-for-sale').title).toBe('Food Trailers for Sale | Concession & Mobile Kitchen | Vendibook');
  });

  it('has a where-to-buy answer block and buyer FAQs on the truck hub', () => {
    const c = cfg('/food-trucks-for-sale');
    expect(c.answerBlock?.heading).toBe('Where to buy a food truck');
    expect(c.answerBlock?.options).toHaveLength(3);
    const qs = c.faqs.map((f) => f.q);
    expect(qs).toContain('Where can I buy a food truck?');
    expect(qs).toContain('Where can I buy a used food truck?');
    expect(qs).toContain('How much does it cost to buy a food truck?');
  });

  it('used page filters only on seller-declared used conditions', () => {
    const c = cfg('/used-food-trucks-for-sale');
    expect(c.conditions).toEqual(USED_CONDITION_VALUES);
    expect(USED_CONDITION_VALUES).not.toContain('new');
    expect(USED_CONDITION_VALUES).toEqual(['like_new', 'good', 'fair', 'needs_work']);
    expect(isUsedCondition(null)).toBe(false);
    expect(isUsedCondition('new')).toBe(false);
    expect(isUsedCondition('good')).toBe(true);
  });

  it('has unique paths and titles (no duplicate pages)', () => {
    const paths = CATEGORY_INDEX_CONFIGS.map((c) => c.path);
    expect(new Set(paths).size).toBe(paths.length);
    const titles = CATEGORY_INDEX_CONFIGS.map((c) => c.title).concat(HOW_TO_BUY_TITLE);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('guide has metadata, steps and FAQs', () => {
    expect(HOW_TO_BUY_PATH).toBe('/how-to-buy-a-food-truck');
    expect(HOW_TO_BUY_DESCRIPTION.length).toBeLessThanOrEqual(220);
    expect(HOW_TO_BUY_STEPS.length).toBeGreaterThanOrEqual(7);
    expect(HOW_TO_BUY_FAQS.length).toBeGreaterThanOrEqual(4);
  });

  it('routes, footer and sitemap include the new pages', () => {
    const app = read('src/App.tsx');
    expect(app).toContain('path="/how-to-buy-a-food-truck"');
    const footer = read('src/components/layout/Footer.tsx');
    expect(footer).toContain("'/used-food-trucks-for-sale'");
    expect(footer).toContain("'/how-to-buy-a-food-truck'");
    const sm = read('public/sitemap_pages.xml');
    for (const p of ['/used-food-trucks-for-sale', '/how-to-buy-a-food-truck', '/food-trucks-for-sale', '/food-trailers-for-sale', '/food-truck-prices']) {
      expect(sm).toContain(`<loc>https://vendibook.com${p}</loc>`);
    }
    expect(sm).not.toContain('buy-a-food-truck-online');
  });

  it('changed buyer content avoids unsupported claims', () => {
    const text = JSON.stringify([
      cfg('/food-trucks-for-sale'), cfg('/food-trailers-for-sale'), cfg('/used-food-trucks-for-sale'),
      HOW_TO_BUY_STEPS, HOW_TO_BUY_FAQS,
    ]).toLowerCase();
    for (const banned of ['escrow', 'stripe', 'verified seller', 'every seller is verified', 'every listing includes', 'buyer protection', 'guaranteed approval', 'guaranteed buyer']) {
      expect(text).not.toContain(banned);
    }
  });
});
