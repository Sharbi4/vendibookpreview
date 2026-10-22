import { describe, it, expect } from 'vitest';
import { buildSocialCaption } from '@/lib/share/socialPostCaption';

const facts = { title: 'Truck A', mode: 'sale', categoryLabel: 'Food Truck', city: 'Tucson', priceText: '$40,000', amenities: ['Generator', 'Fryer'], shareUrl: 'https://vendibook.com/share/listing/a' };

describe('social post captions', () => {
  it('uses only saved listing facts and the share link for Facebook', () => {
    const c = buildSocialCaption('facebook', facts);
    expect(c).toContain('For sale in Tucson: Truck A');
    expect(c).toContain('Price: $40,000');
    expect(c).toContain('Features: Generator, Fryer');
    expect(c).toContain('https://vendibook.com/share/listing/a');
    expect(c).not.toContain('#');
  });
  it('omits missing facts and adds hashtags for Instagram rentals', () => {
    const c = buildSocialCaption('instagram', { title: 'Kitchen B', mode: 'rent', shareUrl: 'https://vendibook.com/share/listing/b' });
    expect(c).toContain('Available to rent: Kitchen B');
    expect(c).not.toContain('Rate:');
    expect(c).not.toContain('Features:');
    expect(c).toContain('#forrent');
  });
});
