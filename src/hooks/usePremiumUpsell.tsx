import { useCallback, useMemo, useState } from 'react';
import { ProductLearnMoreOverlay } from '@/components/monetization/ProductLearnMoreOverlay';
import { useMonetizationProducts } from './useMonetizationProducts';
import { useSubscriptionConsent } from './useSubscriptionConsent';
import { buildCheckoutReturnPaths } from '@/lib/monetization/returnRoutes';
import type { MonetizationProduct } from '@/lib/monetization/products';

/**
 * Which product slug to promote for a given premium feature.
 * All current premium features map to Host Growth (Pro tier).
 */
const FEATURE_TO_SLUG: Record<string, string> = {
  pricepilot: 'host_growth',
  'ai-description': 'host_starter',
  'ai-listing-creator': 'host_starter',
  'marketing-studio': 'host_growth',
  'listing-studio': 'host_growth',
  'concept-lab': 'host_growth',
  'market-radar': 'host_growth',
  'negotiation-coach': 'host_growth',
  'advanced-insights': 'host_growth',
  'listing-insights': 'host_growth',
  buildkit: 'host_operator',
};

export type PremiumFeatureKey = keyof typeof FEATURE_TO_SLUG | string;

/**
 * usePremiumUpsell — returns:
 *   - show(feature, surface): open the ProductLearnMoreOverlay for the
 *     product that unlocks the given feature.
 *   - overlay: JSX to mount once in the surface.
 *   - isPremiumError(parsed): true when a parsed edge error should trigger
 *     an upsell (code === 'entitlement_required' or HTTP 402/403 + code).
 */
export function usePremiumUpsell() {
  const { products } = useMonetizationProducts('host_subscription');
  const { requestCheckout } = useSubscriptionConsent();
  const [open, setOpen] = useState(false);
  const [feature, setFeature] = useState<string | null>(null);
  const [surface, setSurface] = useState<string>('unknown');
  const [busy, setBusy] = useState(false);

  const product: MonetizationProduct | null = useMemo(() => {
    if (!feature) return null;
    const slug = FEATURE_TO_SLUG[feature] ?? 'host_growth';
    return products.find((p) => p.slug === slug) ?? products.find((p) => p.slug === 'host_growth') ?? null;
  }, [feature, products]);

  const show = useCallback((f: PremiumFeatureKey, s = 'premium_leak') => {
    setFeature(f);
    setSurface(s);
    setOpen(true);
  }, []);

  const handleBuy = useCallback(async () => {
    if (!product) return;
    setBusy(true);
    try {
      const paths = buildCheckoutReturnPaths(product.slug);
      await requestCheckout(product, {
        interval: 'monthly',
        successPath: paths.successPath,
        cancelPath: paths.cancelPath,
      });
    } finally {
      setBusy(false);
    }
  }, [product, requestCheckout]);

  const overlay = product ? (
    <ProductLearnMoreOverlay
      open={open}
      onOpenChange={setOpen}
      product={product}
      surface={`upsell:${surface}:${feature ?? ''}`}
      billingLabel="/mo"
      ctaLabel="Upgrade & unlock"
      ctaBusy={busy}
      onBuy={handleBuy}
    />
  ) : null;

  return { show, overlay };
}

/** True when a parsed edge error should trigger the upsell overlay. */
export function isPremiumError(parsed: { status: number | null; code: string | null; raw: unknown }) {
  if (parsed.code === 'entitlement_required' || parsed.code === 'tier_required' || parsed.code === 'tool_locked') return true;
  return parsed.status === 402 || parsed.status === 403;
}

/** Feature slug carried on the 403 body (if any). */
export function featureFromParsed(parsed: { raw: unknown }): string | null {
  const raw = parsed.raw as { feature?: string; tool?: string; requires?: string } | null;
  if (!raw) return null;
  return raw.feature ?? raw.tool ?? null;
}
