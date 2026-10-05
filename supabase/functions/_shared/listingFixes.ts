// Picks the concrete changes most likely to turn listing views into buyer
// contacts, from the listing's own data. Pure (no imports) so the seller
// nudge email and unit tests share it. Ordered by impact; callers show the
// first two or three.

export interface FixableListing {
  title?: string | null;
  mode?: string | null;
  category?: string | null;
  description?: string | null;
  image_urls?: string[] | null;
  condition?: string | null;
  title_status?: string | null;
  operational_status?: string | null;
  year_built?: number | null;
  make?: string | null;
  mileage?: number | null;
  accepts_offers?: boolean | null;
  price_monthly?: number | string | null;
}

export interface ListingFix {
  key: string;
  text: string;
}

const blank = (v: unknown) => v === null || v === undefined || String(v).trim() === '' || v === 'unknown' || v === 'not_sure';

export function pickListingFixes(l: FixableListing): ListingFix[] {
  const fixes: ListingFix[] = [];
  const title = String(l.title ?? '').toLowerCase();
  const isSale = l.mode === 'sale';
  const photos = Array.isArray(l.image_urls) ? l.image_urls.length : 0;
  const descLen = String(l.description ?? '').trim().length;

  if (l.category === 'food_truck' && /\btrailer\b/.test(title) && !/\btruck\b/.test(title)) {
    fixes.push({ key: 'category', text: 'Switch the category to Food Trailer. It is listed as a truck, so trailer buyers never see it in search.' });
  }
  if (isSale && (blank(l.condition) || blank(l.title_status) || blank(l.operational_status))) {
    fixes.push({ key: 'trust_fields', text: 'Fill in condition, title status and running status. These are the first things buyers check.' });
  }
  if (isSale && l.category === 'food_truck' && (blank(l.year_built) || blank(l.make) || blank(l.mileage))) {
    fixes.push({ key: 'truck_basics', text: 'Add the year, make and mileage. Truck buyers filter on these first.' });
  }
  if (photos < 6) {
    fixes.push({ key: 'photos', text: 'Add at least 8 photos, including the inside and the equipment.' });
  }
  if (descLen < 300) {
    fixes.push({ key: 'description', text: "Add 5 to 8 lines on size, power, water and what's included." });
  }
  if (isSale && !l.accepts_offers) {
    fixes.push({ key: 'offers', text: 'Turn on "Accept offers" so buyers can open with a number.' });
  }
  if (l.mode === 'rent' && blank(l.price_monthly)) {
    fixes.push({ key: 'monthly_rate', text: 'Add a monthly rate. Many renters are looking for 1 to 3 months.' });
  }
  return fixes;
}
