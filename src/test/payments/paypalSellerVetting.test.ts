import { describe, expect, it } from 'vitest';

import {
  VAULTING_SCOPES,
  sellerVettingNotices,
  vettingNotice,
} from '@/lib/paypal/sellerVetting';

/**
 * PayPal IWT pp.5-6: sellers must be notified when an ACDC or vaulting
 * application needs more information, is still in review, or was denied, and
 * informed when vaulting is available to them.
 */
describe('seller vetting notices', () => {
  it('says nothing when PayPal has not reported a status', () => {
    expect(vettingNotice('card', null)).toBeNull();
    expect(vettingNotice('vault', undefined)).toBeNull();
    expect(vettingNotice('card', '')).toBeNull();
  });

  it('tells the seller when PayPal needs more information', () => {
    const notice = vettingNotice('card', 'NEED_MORE_DATA');
    expect(notice?.tone).toBe('warn');
    expect(notice?.text).toContain('needs more information');
  });

  it('tells the seller when the application is still in review', () => {
    expect(vettingNotice('vault', 'IN_REVIEW')).toEqual({
      tone: 'info',
      text: 'Saved payment methods: your application is still in review with PayPal.',
    });
  });

  it('tells the seller when the application was denied', () => {
    const notice = vettingNotice('card', 'DENIED');
    expect(notice?.tone).toBe('warn');
    expect(notice?.text).toContain('denied');
  });

  it('reports an unfamiliar PayPal status rather than hiding it', () => {
    expect(vettingNotice('card', 'SOME_NEW_STATE')).toEqual({
      tone: 'info',
      text: 'Advanced card payments: PayPal reports some new state.',
    });
  });

  it('is case- and whitespace-insensitive about PayPal status values', () => {
    expect(vettingNotice('vault', '  subscribed ')?.tone).toBe('ok');
  });
});

describe('vaulting availability requires both approval and granted scopes', () => {
  it('confirms vaulting only when PayPal approved it and the scopes were granted', () => {
    const notices = sellerVettingNotices({
      acdcVettingStatus: 'SUBSCRIBED',
      vaultingStatus: 'SUBSCRIBED',
      grantedScopes: VAULTING_SCOPES,
    });
    expect(notices).toHaveLength(2);
    expect(notices[1]).toEqual({
      tone: 'ok',
      text: 'Saved payment methods: approved by PayPal and available on your listings.',
    });
  });

  it('does not claim vaulting works when the vault scopes were never granted', () => {
    const notices = sellerVettingNotices({
      acdcVettingStatus: null,
      vaultingStatus: 'SUBSCRIBED',
      grantedScopes: ['https://uri.paypal.com/services/payments/realtimepayment'],
    });
    expect(notices).toHaveLength(1);
    expect(notices[0].tone).toBe('info');
    expect(notices[0].text).toContain('not granted to Vendibook');
  });

  it('keeps a blocking vetting state even when every scope is present', () => {
    const notices = sellerVettingNotices({
      acdcVettingStatus: 'NEED_MORE_DATA',
      vaultingStatus: 'IN_REVIEW',
      grantedScopes: VAULTING_SCOPES,
    });
    expect(notices.map((n) => n.tone)).toEqual(['warn', 'info']);
  });

  it('shows nothing for a seller PayPal has not vetted for either feature', () => {
    expect(
      sellerVettingNotices({ acdcVettingStatus: null, vaultingStatus: null, grantedScopes: [] }),
    ).toEqual([]);
  });
});
