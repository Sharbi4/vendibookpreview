import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEntitlements } from '@/hooks/useEntitlements';
import { cn } from '@/lib/utils';

interface FeatureEntitlementGateProps {
  /** Product slugs that unlock this feature. Any active/paid/fulfilled entitlement matches. */
  productSlugs: string[];
  /** If provided, entitlement must be scoped to this listing (for per-listing add-ons). */
  listingId?: string;
  featureName: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  children: ReactNode;
  preview?: boolean;
  className?: string;
}

/**
 * Generic entitlement gate keyed to `monetization_products.slug`.
 * Use for one-time upgrades (Featured, AI Rewrite, Expert Review, etc.).
 * For host subscription tiers use `ProFeatureGate` instead.
 */
export function FeatureEntitlementGate({
  productSlugs,
  listingId,
  featureName,
  description,
  ctaLabel = 'Unlock this feature',
  ctaHref = '/pricing',
  children,
  preview = false,
  className,
}: FeatureEntitlementGateProps) {
  const { bySlug, byListing, loading } = useEntitlements();
  if (loading) return null;

  const isUnlocked = productSlugs.some((slug) => {
    const ent = bySlug[slug];
    if (!ent) return false;
    if (ent.status !== 'active' && ent.status !== 'paid' && ent.status !== 'fulfilled' && ent.status !== 'trialing') {
      return false;
    }
    if (listingId) {
      const listingEnts = byListing[listingId] || [];
      return listingEnts.some((e) => e.productSlug === slug);
    }
    return true;
  });

  if (isUnlocked) return <>{children}</>;

  const upsell = (
    <div
      className={cn(
        'rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card/70 to-card/50 backdrop-blur-sm p-5 md:p-6',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
              Add-on
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              <Lock className="h-3 w-3" aria-hidden /> Locked
            </span>
          </div>
          <h3 className="mt-1 text-base font-semibold text-foreground">{featureName}</h3>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          <Button asChild size="sm" className="mt-3">
            <Link to={ctaHref}>
              {ctaLabel}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );

  if (!preview) return upsell;

  return (
    <div className={cn('relative', className)}>
      <div className="pointer-events-none select-none opacity-40 blur-[2px]" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-md">{upsell}</div>
      </div>
    </div>
  );
}

export default FeatureEntitlementGate;
