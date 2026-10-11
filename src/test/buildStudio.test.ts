import { describe, expect, it } from 'vitest';
import { TRAILER, findFreeSpot, placementIssues, priceBuild, type BuildConfig } from '@/lib/buildStudio/catalog';

describe('Build Studio', () => {
  it('prices base, color and equipment together', () => {
    const c: BuildConfig = { color: 'orange', items: [{ uid: 'a', id: 'griddle36', wall: 'back', x: 0 }] };
    expect(priceBuild(c).total).toBe(TRAILER.basePrice + 900 + 2400);
  });
  it('flags overlap, door blocking and out-of-bounds', () => {
    const c: BuildConfig = { color: 'white', items: [
      { uid: 'a', id: 'griddle36', wall: 'back', x: 0 }, { uid: 'b', id: 'fryer40', wall: 'back', x: 0.3 },
      { uid: 'c', id: 'prep48', wall: 'back', x: 1.8 }, { uid: 'd', id: 'handsink', wall: 'service', x: 2.4 }] };
    expect(placementIssues(c, 'b').join()).toContain('Overlaps');
    expect(placementIssues(c, 'c').join()).toContain('door');
    expect(placementIssues(c, 'd').join()).toContain('past the trailer wall');
  });
  it('finds a free spot that has no issues', () => {
    const c: BuildConfig = { color: 'white', items: [{ uid: 'a', id: 'sink3', wall: 'back', x: -1.6 }] };
    const x = findFreeSpot(c, 'griddle36', 'back')!;
    expect(placementIssues({ ...c, items: [...c.items, { uid: 'n', id: 'griddle36', wall: 'back', x }] }, 'n')).toEqual([]);
  });
});
