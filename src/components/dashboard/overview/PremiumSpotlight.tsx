import { Link } from 'react-router-dom';
import { useCatalogPrice } from '@/hooks/useCatalogPrices';
import { ACTIVE_PRODUCT_SLUGS } from '@/lib/monetization/catalogPricing';
import { Crown, Percent, TrendingUp, Wrench, ArrowRight } from 'lucide-react';
import { useHostEntitlements } from '@/hooks/useHostEntitlements';

/**
 * State-aware Premium module rendered as the last block of the Overview.
 * Free-tier: gold-accented spotlight leading to /pricing.
 * Paid tier: compact "Your membership" summary with renewal + quick links.
 * One module, never both.
 */
const PremiumSpotlight = () => {
  const { tier, planLabel, currentPeriodEnd, cancelAtPeriodEnd, isLoading } = useHostEntitlements();
  if (isLoading) return null;

  if (tier === 'free') {
    return (
      <section
        aria-label="Vendibook Pro"
        className="dash-glass rounded-2xl p-5 sm:p-6 relative overflow-hidden"
        style={{
          borderColor: 'rgba(212, 164, 55, 0.35)',
          boxShadow: '0 0 60px -30px rgba(212, 164, 55, 0.5)',
        }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: '#D4A437' }}>
              Vendibook Pro
            </p>
            <h2 className="mt-1.5 text-[20px] sm:text-[22px] font-semibold text-[rgb(var(--dash-text-1))] leading-snug">
              Keep more of every sale and get seen first.
            </h2>

            <ul className="mt-4 space-y-2.5">
              <li className="flex items-center gap-2.5 text-[14px] text-[rgb(var(--dash-text-1))]">
                <Percent className="h-4 w-4 shrink-0" style={{ color: '#D4A437' }} />
                Lower fees on every sale
              </li>
              <li className="flex items-center gap-2.5 text-[14px] text-[rgb(var(--dash-text-1))]">
                <TrendingUp className="h-4 w-4 shrink-0" style={{ color: '#D4A437' }} />
                Featured placement in search
              </li>
              <li className="flex items-center gap-2.5 text-[14px] text-[rgb(var(--dash-text-1))]">
                <Wrench className="h-4 w-4 shrink-0" style={{ color: '#D4A437' }} />
                All premium tools included
              </li>
            </ul>

            <p className="mt-4 text-[13px] text-[rgb(var(--dash-text-2))]">
              from <span className="font-semibold text-[rgb(var(--dash-text-1))]">{proPrice.labelWithCadence}</span>
            </p>
          </div>

          <Link
            to="/pricing"
            aria-label="See Vendibook Pro plans"
            className="gold-pill inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold shrink-0"
          >
            <Crown className="h-4 w-4" strokeWidth={2.4} />
            See plans
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    );
  }

  // Paid state — compact membership summary
  const renewsLabel = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const isElevated = tier === 'pro' || tier === 'premium';
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);

  return (
    <section aria-label="Your membership" className="dash-glass rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--dash-text-2))]">
            Your membership
          </p>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span
              className={
                isElevated
                  ? 'pro-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold uppercase tracking-[0.14em]'
                  : 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold uppercase tracking-[0.14em] bg-primary/10 text-primary border border-primary/30'
              }
            >
              <Crown className="h-3.5 w-3.5" />
              {tierLabel}
            </span>
            <span className="text-[13px] text-[rgb(var(--dash-text-2))]">{planLabel}</span>
          </div>
          {renewsLabel && (
            <p className="mt-2 text-[13px] text-[rgb(var(--dash-text-2))]">
              {cancelAtPeriodEnd ? 'Ends' : 'Renews'} {renewsLabel}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/account/subscription"
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium border border-border/70 text-[rgb(var(--dash-text-1))] hover:bg-muted/40 transition-colors"
          >
            Manage billing
          </Link>
          <Link
            to="/purchases"
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium text-[rgb(var(--dash-text-2))] hover:text-[rgb(var(--dash-text-1))] transition-colors"
          >
            Your benefits
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PremiumSpotlight;
