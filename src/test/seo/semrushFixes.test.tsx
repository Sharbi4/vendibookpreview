import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import SEO from '@/components/SEO';
import { generateItemListSchema } from '@/components/JsonLd';

afterEach(cleanup);

describe('canonical URLs reported by the Semrush sitemap audit', () => {
  it.each([
    ['/legal/payments-terms', 'https://vendibook.com/legal/payments-terms'],
    ['https://vendibook.com/legal/payments-terms', 'https://vendibook.com/legal/payments-terms'],
    ['https://vendibook.com/why-list-on-vendibook', 'https://vendibook.com/why-list-on-vendibook'],
  ])('publishes a valid canonical and matching social URL for %s', (canonical, expected) => {
    render(<SEO title="Test page" description="Test description" canonical={canonical} />);
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(expected);
    expect(document.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(expected);
  });

  it('updates an absolute canonical when navigating to a relative one', () => {
    const page = render(<SEO title="Legal" description="Legal" canonical="https://vendibook.com/legal/esign" />);
    page.rerender(<SEO title="Coffee" description="Coffee" canonical="/coffee-trucks-trailers-for-sale" />);
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://vendibook.com/coffee-trucks-trailers-for-sale');
  });
});

describe('search structured data', () => {
  it('does not claim a carousel before visible results exist', () => {
    const empty = generateItemListSchema([], { mode: 'sale' });
    expect(empty['@type']).toBe('CollectionPage');
    expect(empty).not.toHaveProperty('itemListElement');
  });

  it('keeps actual results as crawlable listing references', () => {
    const result = generateItemListSchema([
      { id: 'truck-1', title: 'Coffee truck', category: 'food_truck', mode: 'sale', price_sale: 42000, status: 'published' },
    ], { mode: 'sale' });
    expect(result['@type']).toBe('ItemList');
    expect(result.itemListElement?.[0].url).toBe('https://vendibook.com/listing/truck-1');
    expect(result.itemListElement?.[0]).not.toHaveProperty('item');
    expect(JSON.stringify(result)).not.toContain('Offer');
  });
});
