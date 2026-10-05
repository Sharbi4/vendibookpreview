import { describe, expect, it } from 'vitest';
import { saleDisclosures } from './disclosures';

describe('saleDisclosures', () => {
  it('turns stored codes into buyer-facing labels', () => {
    expect(saleDisclosures({ condition: 'like_new', operational_status: 'towable', title_status: 'clean', has_lien: 'no' })).toEqual([
      { key: 'condition', label: 'Condition', value: 'Like new' },
      { key: 'status', label: 'Running status', value: 'Road ready and towable' },
      { key: 'title', label: 'Title', value: 'Clean title' },
      { key: 'lien', label: 'Lien', value: 'No lien' },
    ]);
  });

  it('omits unknown, not-sure and missing answers', () => {
    expect(saleDisclosures({ condition: null, operational_status: 'unknown', title_status: 'not_sure', has_lien: 'not_sure' })).toEqual([]);
    expect(saleDisclosures(null)).toEqual([]);
  });

  it('shows negative disclosures honestly', () => {
    expect(saleDisclosures({ operational_status: 'not_running', title_status: 'no_title', has_lien: 'yes' }).map((d) => d.value))
      .toEqual(['Does not currently run', 'No title', 'Has a lien or loan']);
  });
});
