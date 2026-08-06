import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { LEGACY_LISTING_REDIRECTS, LISTING_ROUTES, authReturnTo } from './routes';

const appSource = readFileSync(path.resolve(__dirname, '../../App.tsx'), 'utf8');

/**
 * Documents the canonical create / resume / edit / publish route map and keeps
 * App.tsx in sync with it. If a route here is renamed, this test fails loudly
 * rather than silently orphaning deep links.
 */
describe('canonical listing route map', () => {
  const routed = [
    '/list',
    '/list/start',
    '/list/concierge',
    '/create-listing/:listingId',
    '/edit-listing/:listingId',
    '/listing-published/:listingId',
  ];

  it.each(routed)('registers %s in App.tsx', (route) => {
    expect(appSource).toContain(`path="${route}"`);
  });

  it('builds resume, edit and published deep links from a listing id', () => {
    expect(LISTING_ROUTES.resume('abc')).toBe('/create-listing/abc');
    expect(LISTING_ROUTES.edit('abc')).toBe('/edit-listing/abc');
    expect(LISTING_ROUTES.published('abc')).toBe('/listing-published/abc');
  });

  it('points the gateway and quick start at the canonical self-service flow', () => {
    expect(LISTING_ROUTES.gateway).toBe('/list/start');
    expect(LISTING_ROUTES.quickStart).toBe('/list?start=true');
  });

  it('redirects every legacy creation entry into the gateway', () => {
    for (const [legacy, target] of Object.entries(LEGACY_LISTING_REDIRECTS)) {
      expect(target).toBe(LISTING_ROUTES.gateway);
      expect(appSource).toContain(`path="${legacy}"`);
      expect(appSource).toContain(
        `<Route path="${legacy}" element={<Navigate to="${target}" replace />} />`,
      );
    }
  });

  it('round-trips the user back to their chosen path after auth', () => {
    expect(authReturnTo(LISTING_ROUTES.quickStart)).toBe(
      '/auth?redirect=%2Flist%3Fstart%3Dtrue',
    );
  });

  it('does not introduce a review or pending-review listing state', () => {
    expect(appSource).not.toMatch(/pending[-_]review/i);
  });
});
