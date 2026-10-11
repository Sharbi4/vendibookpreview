import { describe, expect, it } from 'vitest';
import { TRAILER, findFreeSpot, placementIssues, priceBuild, type BuildConfig } from '@/lib/buildStudio/catalog';

describe('Build Studio', () => {
  it('prices base, color and equipment together', () => {
    const c: BuildConfig = { color: 'orange', items: [{ uid: 'a', id: 'griddle36', wall: 'back', x: 0 }] };
    expect(priceBuild(c).total).toBe(TRAILER.basePrice! + 900 + 2400);
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

import { parseEquipmentCsv, toCents } from '@/lib/buildStudio/partnerCatalog';
import { EQUIPMENT, resetToDemoCatalog, setPartnerCatalog } from '@/lib/buildStudio/catalog';

describe('Build Studio partner catalog', () => {
  it('converts dollars to integer cents without float drift', () => {
    expect(toCents('2400.10')).toBe(240010);
    expect(toCents('$1,234.5')).toBe(123450);
    expect(toCents('0.29')).toBe(29);
    expect(toCents('abc')).toBeUndefined();
    expect(toCents('1.234')).toBeUndefined();
  });
  it('validates CSV rows and keeps blank price as quote-required', () => {
    const ok = parseEquipmentCsv('sku,name,category,width_in,depth_in,height_in,price_usd\nG36,"Griddle, 36""",cooking,36,30,36,2400\nHOOD,Hood,Ventilation,96,30,24,');
    expect(ok.errors).toEqual([]);
    expect(ok.rows[0]).toMatchObject({ name: 'Griddle, 36"', category: 'Cooking', price_cents: 240000 });
    expect(ok.rows[1].price_cents).toBeNull();
    const bad = parseEquipmentCsv('sku,name,category,width_in,depth_in,height_in,price_usd\nX,Y,Nope,0,1,1,abc');
    expect(bad.rows).toEqual([]);
    expect(bad.errors[0]).toMatch(/unknown category.*positive inches.*invalid price/);
  });
  it('loads partner model/equipment into the 3D catalog and filters incompatible items', () => {
    setPartnerCatalog({ id: 'm1', name: 'P 14', int_length_in: 168, int_width_in: 90, int_height_in: 90, door_from_in: null, door_to_in: null,
      window_from_in: 20, window_to_in: 100, base_price_cents: null, lead_time_weeks: 10, standard_features: [], version: 1 }, [
      { id: 'e1', name: 'Fryer', category: 'Cooking', description: null, width_in: 16, depth_in: 31, height_in: 45, power: null, needs: [], install_notes: null,
        compatible_model_ids: [], allowed_walls: ['back'], price_cents: 180000, glb_path: null, version: 2 },
      { id: 'e2', name: 'Other', category: 'Prep', description: null, width_in: 16, depth_in: 31, height_in: 45, power: null, needs: [], install_notes: null,
        compatible_model_ids: ['m2'], allowed_walls: [], price_cents: 1, glb_path: null, version: 1 }]);
    expect(TRAILER.length).toBeCloseTo(168 * 0.0254);
    expect(EQUIPMENT.map((e) => e.id)).toEqual(['e1']);
    const c: BuildConfig = { color: 'white', items: [{ uid: 'a', id: 'e1', wall: 'service', x: -1.5 }] };
    expect(placementIssues(c, 'a')).toContain('Manufacturer does not allow it on this wall');
    expect(priceBuild(c).quoteRequired).toBe(true);
    resetToDemoCatalog();
    expect(TRAILER.basePrice).toBe(28000);
  });
});
