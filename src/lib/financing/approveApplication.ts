import { isUsedCondition } from '@/lib/listings/condition';

export interface ApproveEquipment {
  id: string;
  title?: string;
  price_sale?: number;
  condition?: string | null;
}

/** APPROVE's documented hosted application URL; only public equipment is included. */
export function approveApplicationUrl(listing: ApproveEquipment): string {
  const url = new URL('https://www.kwipped.com/approve/finance');
  url.searchParams.set('approveid', 'ZWuUVF07aZI0sE48tFFhb1cTMHOVaQq0CyLHFQA0');
  url.searchParams.set('link_version', '2.0');
  const type = listing.condition === 'new' ? 'new_product'
    : isUsedCondition(listing.condition) ? 'used_product' : undefined;
  const price = Number(listing.price_sale);
  if (type && listing.title && Number.isFinite(price) && price > 0) {
    const items = [{ model: listing.title, price, subtotal: price, quantity: 1, type }];
    const bytes = new TextEncoder().encode(JSON.stringify(items));
    url.searchParams.set('items', btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join('')));
  }
  return url.toString();
}
