/**
 * Reads live pricing from `monetization_products` — the same rows the PayPal
 * order/subscription amount is derived from server-side. Any surface that
 * shows a price should use this hook instead of a hard-coded string.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { effectivePriceCents } from '@/lib/monetization/products';
import {
  FALLBACK_CADENCE,
  fallbackPriceCents,
  priceDetailLabel,
  priceLabel,
  priceWithCadence,
  type CatalogPriceShape,
} from '@/lib/monetization/catalogPricing';

export interface CatalogPriceRow extends CatalogPriceShape {
  id: string;
  name: string | null;
  description: string | null;
  is_active: boolean;
}

interface RawRow {
  id: string;
  slug: string;
  name: string | null;
  description: string | null;
  price_cents: number;
  promo_price_cents: number | null;
  promo_starts_at: string | null;
  promo_ends_at: string | null;
  billing_type: CatalogPriceShape['billing_type'];
  duration_days: number | null;
  is_active: boolean;
}

async function fetchCatalogPrices(): Promise<Record<string, CatalogPriceRow>> {
  const { data, error } = await (supabase as any)
    .from('monetization_products')
    .select(
      'id, slug, name, description, price_cents, promo_price_cents, promo_starts_at, promo_ends_at, billing_type, duration_days, is_active',
    );
  if (error) throw error;
  const map: Record<string, CatalogPriceRow> = {};
  for (const row of (data ?? []) as RawRow[]) {
    map[row.slug] = {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      // Honour an active promo window exactly like checkout does.
      price_cents: effectivePriceCents(row as never),
      billing_type: row.billing_type,
      duration_days: row.duration_days,
      is_active: row.is_active,
    };
  }
  return map;
}

export function useCatalogPrices() {
  return useQuery({
    queryKey: ['catalog-prices'],
    queryFn: fetchCatalogPrices,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}

export interface CatalogPrice {
  /** Live catalog cents (falls back to the mirrored active price pre-load). */
  cents: number;
  /** Dollars — pass straight to PayPal panels so display === charge. */
  amountUsd: number;
  /** "$49" */
  label: string;
  /** "$79/mo" */
  labelWithCadence: string;
  /** "$49 one-time · 30 days" */
  detailLabel: string;
  billingType: CatalogPriceShape['billing_type'];
  durationDays: number | null;
  name: string | null;
  isActive: boolean;
  /** True while the catalog request is still in flight (fallback in use). */
  loading: boolean;
}

/** Price for a single product slug, safe to render immediately. */
export function useCatalogPrice(slug: string): CatalogPrice {
  const { data, isLoading } = useCatalogPrices();
  const row = data?.[slug];
  const fallbackCadence = FALLBACK_CADENCE[slug] ?? {
    billing_type: 'one_time' as const,
    duration_days: null,
  };
  const shape: CatalogPriceShape = row ?? {
    slug,
    price_cents: fallbackPriceCents(slug),
    billing_type: fallbackCadence.billing_type,
    duration_days: fallbackCadence.duration_days,
  };

  return {
    cents: shape.price_cents,
    amountUsd: shape.price_cents / 100,
    label: priceLabel(shape.price_cents),
    labelWithCadence: priceWithCadence(shape),
    detailLabel: priceDetailLabel(shape),
    billingType: shape.billing_type,
    durationDays: shape.duration_days,
    name: row?.name ?? null,
    isActive: row?.is_active ?? true,
    loading: isLoading && !row,
  };
}
