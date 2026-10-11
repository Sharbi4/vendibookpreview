/** Partner catalog helpers shared by manual entry and CSV import (one normalized shape). */
export const EQUIPMENT_CATEGORIES = ['Cooking', 'Refrigeration', 'Prep', 'Sanitation', 'Ventilation', 'Electrical', 'Generator',
  'Solar & battery', 'Serving window', 'Interior finish', 'Exterior finish', 'Other'] as const;

/** Dollars string -> integer cents without float drift; undefined when invalid. */
export function toCents(v: string): number | undefined {
  const s = v.trim().replace(/[$,]/g, '');
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return undefined;
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}

export interface EquipmentImportRow {
  sku: string; name: string; category: string; width_in: number; depth_in: number; height_in: number;
  price_cents: number | null; power: string | null; description: string | null;
}

export function parseEquipmentCsv(text: string): { rows: EquipmentImportRow[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const errors: string[] = []; const rows: EquipmentImportRow[] = [];
  if (!lines.length) return { rows, errors: ['The file is empty'] };
  const head = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const need = ['sku', 'name', 'category', 'width_in', 'depth_in', 'height_in', 'price_usd'];
  const missing = need.filter((h) => !head.includes(h));
  if (missing.length) return { rows, errors: [`Missing columns: ${missing.join(', ')}`] };
  if (lines.length > 501) return { rows, errors: ['Import up to 500 rows at a time'] };
  const seen = new Set<string>();
  lines.slice(1).forEach((line, idx) => {
    const cells = splitCsvLine(line); const get = (k: string) => cells[head.indexOf(k)] ?? '';
    const n = idx + 2; const sku = get('sku'); const name = get('name');
    const cat = EQUIPMENT_CATEGORIES.find((c) => c.toLowerCase() === get('category').toLowerCase());
    const dims = ['width_in', 'depth_in', 'height_in'].map((k) => Number(get(k)));
    const priceRaw = get('price_usd'); const price = priceRaw === '' ? null : toCents(priceRaw);
    const rowErr: string[] = [];
    if (!sku || sku.length > 60) rowErr.push('SKU required (max 60)');
    else if (seen.has(sku)) rowErr.push('duplicate SKU in file');
    if (name.length < 2 || name.length > 120) rowErr.push('name required');
    if (!cat) rowErr.push(`unknown category "${get('category')}"`);
    if (dims.some((d) => !Number.isFinite(d) || d <= 0)) rowErr.push('width/depth/height must be positive inches');
    if (price === undefined) rowErr.push('invalid price');
    if (rowErr.length) { errors.push(`Row ${n}: ${rowErr.join('; ')}`); return; }
    seen.add(sku);
    rows.push({ sku, name, category: cat!, width_in: dims[0], depth_in: dims[1], height_in: dims[2], price_cents: price as number | null,
      power: get('power') || null, description: get('description').slice(0, 1000) || null });
  });
  return { rows: errors.length ? [] : rows, errors };
}
export const DELIVERY_LABELS: Record<string, string> = { factory_pickup: 'Pick up at factory', delivered: 'Delivered', towed: 'Towed to you', flatbed: 'Flatbed delivery', other: 'Other' };
