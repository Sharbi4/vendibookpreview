import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SPECIALTY_DEFS, specialtyOrFilter, type SpecialtyKey } from '@/lib/listings/specialty';

export type InventoryCategory = 'food_truck' | 'food_trailer' | 'ghost_kitchen' | 'vendor_space';
export type InventoryMode = 'rent' | 'sale' | 'any';

/** Live nationwide inventory for the same specialty/category, plus the
 *  canonical national landing page to send the visitor to. Counts are always
 *  real — never rounded up, never fabricated. */
export interface NationwideInventory {
  loading: boolean;
  /** Real live count for the label shown. */
  count: number;
  /** e.g. "coffee trucks" — pluralized noun used in copy. */
  label: string;
  /** Canonical national landing page (no duplicate query URLs where one exists). */
  href: string;
  /** True when the specialty count was too low and we fell back to the broader category. */
  broadened: boolean;
}

const CATEGORY_PLURAL: Record<InventoryCategory, string> = {
  food_truck: 'food trucks',
  food_trailer: 'food trailers',
  ghost_kitchen: 'shared kitchens',
  vendor_space: 'vendor spaces',
};

/** Canonical national landing page for a category + mode (never a query URL). */
export const nationalLandingPath = (
  categories: InventoryCategory[],
  mode: InventoryMode,
): string => {
  const multi = categories.length > 1;
  const cat = categories[0];
  if (mode === 'rent') {
    if (multi || cat === 'food_truck') return '/food-trucks-for-rent';
    if (cat === 'food_trailer') return '/food-trailers-for-rent';
    if (cat === 'ghost_kitchen') return '/shared-kitchens';
    return '/vendor-spaces';
  }
  if (mode === 'sale') {
    if (multi || cat === 'food_truck') return '/food-trucks-for-sale';
    if (cat === 'food_trailer') return '/food-trailers-for-sale';
    if (cat === 'ghost_kitchen') return '/shared-kitchens';
    return '/vendor-spaces';
  }
  if (multi || cat === 'food_truck') return '/food-trucks';
  if (cat === 'food_trailer') return '/food-trailers';
  if (cat === 'ghost_kitchen') return '/shared-kitchens';
  return '/vendor-spaces';
};

const categoryLabelFor = (categories: InventoryCategory[]): string =>
  categories.length > 1 ? 'food trucks & trailers' : CATEGORY_PLURAL[categories[0]];

const countLive = async (
  categories: InventoryCategory[],
  mode: InventoryMode,
  orFilter?: string,
): Promise<number> => {
  let q = supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .is('deleted_at', null)
    .eq('moderation_status', 'clear')
    .in('category', categories as any[])
    .not('title', 'ilike', 'demo%');
  if (mode !== 'any') q = q.eq('mode', mode);
  if (orFilter) q = q.or(orFilter);
  const { count } = await q;
  return count ?? 0;
};

const MIN_NATIONWIDE = 6;

/**
 * Resolves the real nationwide inventory count for the page's specialty or
 * category. When a specialty count is itself thin, falls back to the broader
 * category so the number shown is always meaningful and true.
 */
export const useNationwideInventory = (opts: {
  categories: InventoryCategory[];
  mode: InventoryMode;
  specialty?: SpecialtyKey;
  enabled?: boolean;
}): NationwideInventory => {
  const { categories, mode, specialty, enabled = true } = opts;
  const key = `${categories.join(',')}|${mode}|${specialty ?? ''}`;

  const [state, setState] = useState<NationwideInventory>({
    loading: true,
    count: 0,
    label: specialty ? SPECIALTY_DEFS[specialty].pluralLower : categoryLabelFor(categories),
    href: specialty ? SPECIALTY_DEFS[specialty].hubPath : nationalLandingPath(categories, mode),
    broadened: false,
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      setState((s) => ({ ...s, loading: true }));
      try {
        if (specialty) {
          const def = SPECIALTY_DEFS[specialty];
          const specialtyCount = await countLive(categories, mode, specialtyOrFilter(specialty));
          if (cancelled) return;
          if (specialtyCount >= MIN_NATIONWIDE) {
            setState({
              loading: false,
              count: specialtyCount,
              label: def.pluralLower,
              href: def.hubPath,
              broadened: false,
            });
            return;
          }
        }
        const broadCount = await countLive(categories, mode);
        if (cancelled) return;
        setState({
          loading: false,
          count: broadCount,
          label: categoryLabelFor(categories),
          href: nationalLandingPath(categories, mode),
          broadened: Boolean(specialty),
        });
      } catch {
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return state;
};
