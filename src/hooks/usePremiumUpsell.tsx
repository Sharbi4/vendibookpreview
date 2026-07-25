import { useCallback, useState } from 'react';
import { ToolUnlockDialog } from '@/components/monetization/ToolUnlockDialog';

/**
 * Map a premium feature key to a tool slug in the catalog. Every gate
 * resolves to a specific tool so the upsell overlay can show the real
 * sample preview + the full ladder (cheapest first).
 */
const FEATURE_TO_TOOL_SLUG: Record<string, string> = {
  pricepilot: 'pricepilot',
  'ai-description': 'listing-studio',
  'ai-listing-creator': 'listing-studio',
  'listing-studio': 'listing-studio',
  'marketing-studio': 'marketing-studio',
  'concept-lab': 'concept-lab',
  'market-radar': 'market-radar',
  'negotiation-coach': 'pricepilot',
  'advanced-insights': 'market-radar',
  'listing-insights': 'market-radar',
  buildkit: 'buildkit',
  permitpath: 'permitpath',
};

export type PremiumFeatureKey = keyof typeof FEATURE_TO_TOOL_SLUG | string;

/**
 * usePremiumUpsell — opens the unified ToolUnlockDialog, which shows the
 * real sample preview + the full unlock ladder (one-time / weekly pass /
 * lowest-tier / best-value). Never presents only a single expensive tier.
 */
export function usePremiumUpsell() {
  const [open, setOpen] = useState(false);
  const [toolSlug, setToolSlug] = useState<string>('pricepilot');
  const [surface, setSurface] = useState<string>('unknown');

  const show = useCallback((feature: PremiumFeatureKey, s = 'premium_leak') => {
    setToolSlug(FEATURE_TO_TOOL_SLUG[feature] ?? feature ?? 'pricepilot');
    setSurface(s);
    setOpen(true);
  }, []);

  const overlay = (
    <ToolUnlockDialog
      open={open}
      onOpenChange={setOpen}
      toolSlug={toolSlug}
      surface={surface}
    />
  );

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
