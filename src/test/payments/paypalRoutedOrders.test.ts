import { describe, expect, it } from 'vitest';

import { buildOrderDetail } from '../../../supabase/functions/_shared/paypalOrderDetail';
import { routedMerchantId } from '../../../supabase/functions/_shared/paypalMultiparty';

describe('routedMerchantId', () => {
  it('returns the seller merchant id recorded when the order was routed', () => {
    const record = { metadata: { multiparty: { routed: true, merchant_id: 'WEHZLZNTDJ3Y4', platform_fee_cents: 463 } } };
    expect(routedMerchantId(record)).toBe('WEHZLZNTDJ3Y4');
  });

  it('is null for first-party orders', () => {
    expect(routedMerchantId({ metadata: { paypal_status: 'CREATED' } })).toBeNull();
    expect(routedMerchantId({ metadata: null })).toBeNull();
    expect(routedMerchantId(null)).toBeNull();
  });

  it('ignores Square-routed rental records', () => {
    const record = { metadata: { multiparty: { routed: true, provider: 'square', merchant_id: 'SQ123' } } };
    expect(routedMerchantId(record)).toBeNull();
  });
});

describe('buildOrderDetail item naming', () => {
  const quote = {
    reference: 'VB-SALE-TEST',
    description: 'Vendibook purchase — 2021 Food Trailer',
    breakdown: [
      { label: 'Item price', amountCents: 2500 },
      { label: 'Estimated tax (AZ)', amountCents: 140, kind: 'tax' },
    ],
    taxCents: 140,
    grossCents: 2640,
  };

  it('names the item after the listing and keeps the quote label as its description', () => {
    const detail = buildOrderDetail(quote, { physical: true, itemName: '2021 Food Trailer' });
    expect(detail.items[0]).toMatchObject({
      name: '2021 Food Trailer',
      description: 'Item price',
      category: 'PHYSICAL_GOODS',
      unitAmountCents: 2500,
    });
    expect(detail.itemTotalCents + detail.taxCents).toBe(2640);
  });

  it('only renames the first line', () => {
    const detail = buildOrderDetail(
      { ...quote, breakdown: [...quote.breakdown, { label: 'Buyer fee', amountCents: 100 }], grossCents: 2740 },
      { itemName: '2021 Food Trailer' },
    );
    expect(detail.items.map((i) => i.name)).toEqual(['2021 Food Trailer', 'Buyer fee']);
  });

  it('falls back to the quote label without a listing title', () => {
    expect(buildOrderDetail(quote).items[0].name).toBe('Item price');
  });
});
