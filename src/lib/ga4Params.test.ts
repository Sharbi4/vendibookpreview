import { describe, expect, it } from 'vitest';
import { toGa4EventParams } from './ga4Params';

describe('toGa4EventParams', () => {
  it('renames keys GA4 treats as traffic-source overrides', () => {
    expect(toGa4EventParams({ source: 'search_page', medium: 'x', campaign: 'y', listing_id: 'l1', result_count: 0 }))
      .toEqual({ ui_source: 'search_page', ui_medium: 'x', ui_campaign: 'y', listing_id: 'l1', result_count: 0 });
    expect(toGa4EventParams({ campaign_source: 'a', content: 'b', term: 'c' }))
      .toEqual({ ui_campaign_source: 'a', ui_content: 'b', ui_term: 'c' });
  });

  it('handles missing params', () => {
    expect(toGa4EventParams(undefined)).toEqual({});
    expect(toGa4EventParams(null)).toEqual({});
  });
});
