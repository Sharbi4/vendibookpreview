import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StrictMode } from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const dbMock = vi.fn();
vi.mock('@/hooks/useAnalyticsEvents', () => ({ trackEventToDb: (...a: unknown[]) => dbMock(...a) }));
let consent = false;
vi.mock('@/lib/cookieConsent', () => ({ hasAnalyticsConsent: () => consent, CONSENT_CHANGE_EVENT: 'vb:cookie-consent-change' }));

import { useBuyerSeoTracking } from '@/hooks/useBuyerSeoTracking';
import { __resetBuyerSeoTracking } from '@/lib/buyerSeoTracking';

const Page = () => {
  const onClick = useBuyerSeoTracking('/food-trucks-for-sale', 'food_truck');
  return <main onClickCapture={onClick}><a href="/search?category=food_truck&q=x" data-cta-id="hero_search">go</a></main>;
};
const mount = () => render(<StrictMode><MemoryRouter initialEntries={['/food-trucks-for-sale?utm_source=linkedin']}><Page /></MemoryRouter></StrictMode>);
const views = () => dbMock.mock.calls.filter((c) => c[0] === 'buyer_seo_landing_view');

describe('useBuyerSeoTracking consent integration', () => {
  beforeEach(() => { dbMock.mockReset(); __resetBuyerSeoTracking(); consent = false; });

  it('StrictMode with consent => exactly one view', () => {
    consent = true;
    mount();
    expect(views()).toHaveLength(1);
  });

  it('late consent on the landing page captures the view once with attribution', () => {
    mount();
    expect(dbMock).not.toHaveBeenCalled();
    consent = true;
    act(() => { window.dispatchEvent(new Event('vb:cookie-consent-change')); });
    act(() => { window.dispatchEvent(new Event('vb:cookie-consent-change')); });
    expect(views()).toHaveLength(1);
    expect(JSON.parse(sessionStorage.getItem('vb_buyer_seo_attr')!)).toMatchObject({ utm_source: 'linkedin' });
  });

  it('CTA click after late consent records landing first, then sanitized click', () => {
    const { getByText } = mount();
    consent = true;
    getByText('go').addEventListener('click', (e) => e.preventDefault());
    act(() => { getByText('go').click(); });
    expect(dbMock.mock.calls.map((c) => c[0])).toEqual(['buyer_seo_landing_view', 'buyer_seo_cta_click']);
    expect(dbMock.mock.calls[1][2].destination).toBe('/search?category=food_truck');
  });
});
