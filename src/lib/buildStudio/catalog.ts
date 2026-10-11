/**
 * Build Studio prototype catalog. All dimensions are metres (X = trailer
 * length, Y = up, Z = width; origin = floor centre). ALL PRICES ARE
 * DEMONSTRATION DATA until a regional manufacturer supplies approved pricing.
 */
export let DEMO_DATA = true;

export const TRAILER = {
  id: 'concession-16',
  name: '16 ft concession trailer',
  length: 4.88, // 16 ft
  width: 2.29,  // ~7.5 ft interior
  height: 2.29,
  basePrice: 28000 as number | null,
  // Keep-clear zones on each wall, as [start, end] along X.
  door: { wall: 'back' as Wall, from: 1.3, to: 2.44 },
  window: { from: -1.6, to: 0.8 },
};
const DEMO_TRAILER = structuredClone(TRAILER);

export type Wall = 'back' | 'service';

export interface EquipmentSpec {
  id: string;
  name: string;
  category: 'Cooking' | 'Refrigeration' | 'Sanitation' | 'Prep';
  w: number; d: number; h: number;
  /** null = requires manufacturer quote */
  price: number | null;
  power: string;
  /** Walls the manufacturer approves for this item (default both). */
  allowedWalls?: Wall[];
  needs: string[];
  notes: string;
  color: string;
  /** GLB path once an approved asset exists; procedural until then. */
  model?: string;
}

export let EQUIPMENT: EquipmentSpec[] = [
  { id: 'griddle36', name: '36" flat-top griddle', category: 'Cooking', w: 0.91, d: 0.76, h: 0.92, price: 2400,
    power: 'Propane, ~90,000 BTU', needs: ['Exhaust hood', 'Fire suppression', 'Stainless backsplash'],
    notes: 'Burgers, cheesesteaks, breakfast. Needs to sit under the hood.', color: '#9aa3ab' },
  { id: 'fryer40', name: '40 lb fryer', category: 'Cooking', w: 0.4, d: 0.78, h: 1.15, price: 1800,
    power: 'Propane, ~105,000 BTU', needs: ['Exhaust hood', 'Fire suppression', '18" from open flame or a splash guard'],
    notes: 'Fries, wings, tacos dorados. Plan oil storage and disposal.', color: '#8d969e' },
  { id: 'reachin', name: 'Reach-in refrigerator', category: 'Refrigeration', w: 0.7, d: 0.8, h: 2.0, price: 3200,
    power: '115 V, ~6 A', needs: ['Dedicated outlet', 'Ventilation clearance'],
    notes: 'Main cold storage. Usually placed away from cooking heat.', color: '#c8ced3' },
  { id: 'sink3', name: '3-compartment sink', category: 'Sanitation', w: 1.5, d: 0.6, h: 0.9, price: 1200,
    power: 'Water heater + fresh/grey tanks', needs: ['Fresh water tank', 'Grey water tank (larger than fresh)', 'Water heater'],
    notes: 'Required by most health departments for washing utensils.', color: '#b7bfc6' },
  { id: 'handsink', name: 'Hand sink', category: 'Sanitation', w: 0.4, d: 0.4, h: 0.9, price: 350,
    power: 'Water heater + tanks', needs: ['Soap and towel dispenser'],
    notes: 'Separate hand-washing sink, required by most health departments.', color: '#b7bfc6' },
  { id: 'prep48', name: '48" prep table', category: 'Prep', w: 1.22, d: 0.76, h: 0.9, price: 650,
    power: 'None', needs: [], notes: 'Stainless work surface; storage shelf below.', color: '#a9b1b8' },
];

const DEMO_EQUIPMENT = EQUIPMENT;

/** Catalog row shape returned by the bs_resolve_zip RPC (inches, cents). */
export interface PartnerModel {
  id: string; name: string; int_length_in: number; int_width_in: number; int_height_in: number;
  door_from_in: number | null; door_to_in: number | null; window_from_in: number | null; window_to_in: number | null;
  base_price_cents: number | null; lead_time_weeks: number | null; standard_features: string[]; version: number;
}
export interface PartnerEquipment {
  id: string; name: string; category: string; description: string | null; width_in: number; depth_in: number; height_in: number;
  power: string | null; needs: string[]; install_notes: string | null; compatible_model_ids: string[]; allowed_walls: string[];
  price_cents: number | null; glb_path: string | null; version: number; color_hex?: string | null;
}
export interface Finish { id: string; name: string; hex: string; price: number | null }
/** Partner exterior finishes (priced paint/wrap options); empty in demo mode. */
export let FINISHES: Finish[] = [];
const IN = 0.0254;
const TONES: Record<string, string> = { Refrigeration: '#c8ced3', Sanitation: '#b7bfc6', Cooking: '#9aa3ab' };

/** Switch the configurator to a regional partner's approved model and equipment. */
export function setPartnerCatalog(model: PartnerModel, equipment: PartnerEquipment[]) {
  const L = model.int_length_in * IN;
  const zone = (a: number | null, b: number | null, fb: { from: number; to: number }) =>
    a != null && b != null && b > a ? { from: a * IN - L / 2, to: b * IN - L / 2 } : { from: (fb.from / DEMO_TRAILER.length) * L, to: (fb.to / DEMO_TRAILER.length) * L };
  Object.assign(TRAILER, {
    id: model.id, name: model.name, length: L, width: model.int_width_in * IN, height: model.int_height_in * IN,
    basePrice: model.base_price_cents == null ? null : model.base_price_cents / 100,
    door: { wall: 'back' as Wall, ...zone(model.door_from_in, model.door_to_in, DEMO_TRAILER.door) },
    window: zone(model.window_from_in, model.window_to_in, DEMO_TRAILER.window),
  });
  const compatible = equipment.filter((e) => !e.compatible_model_ids?.length || e.compatible_model_ids.includes(model.id));
  FINISHES = compatible.filter((e) => e.category === 'Exterior finish')
    .map((e) => ({ id: e.id, name: e.name, hex: e.color_hex || '#f2f1ee', price: e.price_cents == null ? null : e.price_cents / 100 }));
  EQUIPMENT = compatible.filter((e) => e.category !== 'Exterior finish')
    .map((e) => ({
      id: e.id, name: e.name, category: e.category as EquipmentSpec['category'],
      w: e.width_in * IN, d: e.depth_in * IN, h: e.height_in * IN,
      price: e.price_cents == null ? null : e.price_cents / 100,
      power: e.power || 'See manufacturer specs', needs: e.needs ?? [], notes: [e.description, e.install_notes].filter(Boolean).join(' '),
      color: TONES[e.category] ?? '#a9b1b8', model: e.glb_path ?? undefined,
      allowedWalls: (e.allowed_walls?.length ? e.allowed_walls : ['back', 'service']) as Wall[],
    }));
  DEMO_DATA = false;
}

export function resetToDemoCatalog() {
  Object.assign(TRAILER, structuredClone(DEMO_TRAILER));
  EQUIPMENT = DEMO_EQUIPMENT;
  FINISHES = [];
  DEMO_DATA = true;
}

export const EXTERIOR_COLORS = [
  { id: 'white', name: 'Gloss white', hex: '#f2f1ee', price: 0 },
  { id: 'charcoal', name: 'Charcoal', hex: '#2b2d31', price: 900 },
  { id: 'orange', name: 'Vendibook orange', hex: '#f26a1b', price: 900 },
  { id: 'teal', name: 'Deep teal', hex: '#1f5e63', price: 900 },
  { id: 'steel', name: 'Brushed stainless', hex: '#b9bec3', price: 2400 },
];

export interface Placement { uid: string; id: string; wall: Wall; x: number }
export interface BuildConfig { color: string; items: Placement[]; /** partner exterior finish id */ finish?: string }

export const exteriorHex = (c: BuildConfig) =>
  FINISHES.find((f) => f.id === c.finish)?.hex ?? (EXTERIOR_COLORS.find((x) => x.id === c.color) ?? EXTERIOR_COLORS[0]).hex;

export const specOf = (id: string) => EQUIPMENT.find((e) => e.id === id) ?? {
  id, name: 'Unavailable item', category: 'Prep' as const, w: 0.3, d: 0.3, h: 0.3, price: null, power: '', needs: [], notes: 'No longer offered.', color: '#999',
};
const DELIVERY_ESTIMATE = 0; // set by manufacturer data; not shown as a charge yet

export function priceBuild(config: BuildConfig) {
  const color = EXTERIOR_COLORS.find((c) => c.id === config.color) ?? EXTERIOR_COLORS[0];
  const lines: { label: string; amount: number | null }[] = [
    { label: TRAILER.name, amount: TRAILER.basePrice as number | null },
    ...(DEMO_DATA ? [{ label: `Exterior: ${color.name}`, amount: color.price }] : []),
    ...config.items.map((p) => ({ label: specOf(p.id).name, amount: specOf(p.id).price })),
  ];
  return {
    lines,
    total: lines.reduce((s, l) => s + (l.amount ?? 0), 0) + DELIVERY_ESTIMATE,
    quoteRequired: lines.some((l) => l.amount == null),
  };
}

/** Problems for one placement: out of bounds, overlapping, blocking the door. */
export function placementIssues(config: BuildConfig, uid: string): string[] {
  const p = config.items.find((i) => i.uid === uid);
  if (!p) return [];
  const s = specOf(p.id);
  const a = [p.x - s.w / 2, p.x + s.w / 2] as const;
  const half = TRAILER.length / 2;
  const issues: string[] = [];
  if (a[0] < -half - 1e-6 || a[1] > half + 1e-6) issues.push('Extends past the trailer wall');
  if (s.allowedWalls && !s.allowedWalls.includes(p.wall)) issues.push('Manufacturer does not allow it on this wall');
  if (p.wall === TRAILER.door.wall && a[1] > TRAILER.door.from && a[0] < TRAILER.door.to) issues.push('Blocks the entry door');
  if (p.wall === 'service' && s.h > 1.2 && a[1] > TRAILER.window.from && a[0] < TRAILER.window.to) issues.push('Blocks the service window');
  for (const o of config.items) {
    if (o.uid === uid || o.wall !== p.wall) continue;
    const os = specOf(o.id);
    if (a[1] > o.x - os.w / 2 + 1e-6 && a[0] < o.x + os.w / 2 - 1e-6) issues.push(`Overlaps ${os.name}`);
  }
  // Opposite walls must leave a working aisle.
  const otherDepth = Math.max(0, ...config.items.filter((o) => o.wall !== p.wall
    && a[1] > o.x - specOf(o.id).w / 2 && a[0] < o.x + specOf(o.id).w / 2).map((o) => specOf(o.id).d));
  if (otherDepth && TRAILER.width - s.d - otherDepth < 0.76) issues.push('Aisle narrower than 30"');
  return issues;
}

/** First free X on the given wall for a new item, or null if none fits. */
export function findFreeSpot(config: BuildConfig, id: string, wall: Wall): number | null {
  const s = specOf(id);
  const half = TRAILER.length / 2;
  for (let x = -half + s.w / 2; x <= half - s.w / 2 + 1e-6; x += 0.05) {
    const trial = { ...config, items: [...config.items, { uid: '_t', id, wall, x: +x.toFixed(2) }] };
    if (!placementIssues(trial, '_t').length) return +x.toFixed(2);
  }
  return null;
}

/** Menu-to-equipment suggestions (educational; not a manufacturer requirement). */
export const MENU_SUGGESTIONS: Record<string, string[]> = {
  Burgers: ['griddle36', 'fryer40', 'reachin', 'prep48'],
  Tacos: ['griddle36', 'reachin', 'prep48'],
  'Fries & wings': ['fryer40', 'reachin'],
  'Coffee & drinks': ['reachin', 'prep48'],
};
export const ALWAYS_REQUIRED = ['sink3', 'handsink'];
