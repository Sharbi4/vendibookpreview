const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type MetaProduct = { id: string; quantity: number };

/** Input has already been decoded by URLSearchParams. Never decode it twice. */
export function parseMetaProducts(raw: string | null): MetaProduct[] {
  const products = new Map<string, MetaProduct>();
  for (const entry of (raw ?? '').split(',')) {
    const parts = entry.trim().split(':');
    const id = parts[0].trim().toLowerCase();
    const quantityText = parts[1]?.trim() ?? '1';
    if (parts.length > 2 || !UUID.test(id) || !/^\d+$/.test(quantityText)) continue;
    const quantity = Number(quantityText);
    if (!Number.isSafeInteger(quantity) || quantity < 1) continue;
    const total = (products.get(id)?.quantity ?? 0) + quantity;
    if (!Number.isSafeInteger(total)) continue;
    products.set(id, { id, quantity: total });
  }
  return [...products.values()];
}
