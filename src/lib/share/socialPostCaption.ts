/**
 * Builds platform-specific social captions strictly from saved listing facts.
 * Never adds claims (condition, demand, financing, etc.) that the seller did not enter.
 */
export type SocialPlatform = 'facebook' | 'instagram';

export interface SocialPostFacts {
  title: string;
  mode: 'sale' | 'rent' | string;
  categoryLabel?: string | null;
  city?: string | null;
  priceText?: string | null;
  amenities?: string[] | null;
  shareUrl: string;
}

const clean = (s?: string | null) => (s || '').replace(/\s+/g, ' ').trim();

const tag = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export function buildSocialCaption(platform: SocialPlatform, f: SocialPostFacts): string {
  const title = clean(f.title) || 'My listing';
  const city = clean(f.city);
  const price = clean(f.priceText);
  const amenities = (f.amenities || []).map(clean).filter(Boolean).slice(0, 5);
  const sale = f.mode === 'sale';
  const lead = sale ? `For sale${city ? ` in ${city}` : ''}` : `Available to rent${city ? ` in ${city}` : ''}`;
  const priceLine = price ? (sale ? `Price: ${price}` : `Rate: ${price}`) : '';
  const featureLine = amenities.length ? `Features: ${amenities.join(', ')}` : '';
  const cta = sale ? 'See photos and full details' : 'See photos, details and availability';

  if (platform === 'facebook') {
    return [`${lead}: ${title}`, priceLine, featureLine, `${cta} on Vendibook:`, f.shareUrl]
      .filter(Boolean)
      .join('\n\n');
  }

  const tags = ['vendibook', f.categoryLabel ? tag(f.categoryLabel) : '', city ? tag(city) : '', sale ? 'forsale' : 'forrent']
    .filter(Boolean)
    .map((t) => `#${t}`);
  return [
    `${lead}: ${title}`,
    priceLine,
    featureLine,
    `${cta} — link in bio or Story link sticker:`,
    f.shareUrl,
    [...new Set(tags)].join(' '),
  ]
    .filter(Boolean)
    .join('\n\n');
}
