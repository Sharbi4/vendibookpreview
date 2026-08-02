import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, ShieldCheck, XCircle, Lock } from 'lucide-react';
import { useMonetizationProducts } from '@/hooks/useMonetizationProducts';
import { buildCheckoutReturnPaths, buildPlanAuthReturnTo } from '@/lib/monetization/returnRoutes';
import { effectivePriceCents, type MonetizationProduct } from '@/lib/monetization/products';
import { cn } from '@/lib/utils';
import PremiumTierCard from './PremiumTierCard';
import PlansComparisonTable from './PlansComparisonTable';
import PlansFAQ from './PlansFAQ';
import ProWeeklyPassCard from './ProWeeklyPassCard';
import { TrustESignChip } from '@/components/trust/TrustESignChip';
import { TIER_CATALOG, type TierRole } from './tierCatalog';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionConsent } from '@/hooks/useSubscriptionConsent';
import { useListingQuota } from '@/hooks/useListingQuota';
import { toast } from 'sonner';

import heroImg from '@/assets/trailer-orange-grill.jpg';


type Interval = 'monthly' | 'annual';

interface TierRow {
  role: TierRole;
  base?: string;
}

const TIER_MAP: TierRow[] = [
  { role: 'free' },
  { role: 'starter', base: 'host_starter' },
  { role: 'pro', base: 'host_growth' },
  { role: 'premium', base: 'host_operator' },
];

function pair(products: MonetizationProduct[], base: string) {
  const monthly = products.find(p => p.slug === base || p.slug === `${base}_monthly`);
  const annual = products.find(p => p.slug === `${base}_annual`);
  return { monthly, annual };
}

function savingsPct(monthly?: MonetizationProduct, annual?: MonetizationProduct) {
  if (!monthly || !annual) return null;
  const y = effectivePriceCents(monthly) * 12;
  if (y <= 0) return null;
  const pct = Math.round(((y - effectivePriceCents(annual)) / y) * 100);
  return pct > 0 ? pct : null;
}

interface Props {
  compact?: boolean;
  /** Override successPath forwarded to PremiumTierCard (e.g. return-to-wizard). */
  successPathOverride?: string;
  /** Override cancelPath forwarded to PremiumTierCard (e.g. return-to-wizard). */
  cancelPathOverride?: string;
}

export function PremiumPlansSection({ compact = false, successPathOverride, cancelPathOverride }: Props) {

  const { products, loading } = useMonetizationProducts('host_subscription');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { requestCheckout, dialog: resumeDialog } = useSubscriptionConsent();
  const initialInterval: Interval = (() => {
    try {
      const q = new URLSearchParams(location.search).get('interval');
      return q === 'annual' ? 'annual' : 'monthly';
    } catch { return 'monthly'; }
  })();
  const [interval, setInterval] = useState<Interval>(initialInterval);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const autoResumeTried = useRef(false);

  useEffect(() => {
    const onScroll = () => setShowStickyCta(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const tiers = useMemo(() =>
    TIER_MAP.map(t => ({
      ...t,
      ...(t.base ? pair(products, t.base) : { monthly: undefined, annual: undefined }),
    })),
  [products]);

  const growth = tiers.find(t => t.role === 'pro');
  const proSave = growth ? savingsPct(growth.monthly, growth.annual) : null;

  // Auto-resume checkout after auth redirect: /pricing?plan=<slug>&interval=<x>&auto=1
  useEffect(() => {
    if (autoResumeTried.current) return;
    if (loading || authLoading) return;
    if (!user) return;
    const params = new URLSearchParams(location.search);
    if (params.get('auto') !== '1') return;
    const slug = params.get('plan');
    const wantInterval: Interval = params.get('interval') === 'annual' ? 'annual' : 'monthly';
    if (!slug) return;
    autoResumeTried.current = true;
    setInterval(wantInterval);
    const product =
      products.find(p => p.slug === slug) ??
      products.find(p => p.slug === (wantInterval === 'annual' ? `${slug}_annual` : slug));
    if (!product) {
      toast.error(`We couldn't find that plan (${slug}). Pick one below.`);
    } else {
      const paths = buildCheckoutReturnPaths(product.slug);
      requestCheckout(product, {
        interval: wantInterval,
        successPath: successPathOverride ?? paths.successPath,
        cancelPath: cancelPathOverride ?? paths.cancelPath,
      }).catch((e) => console.error('[plans] auto-resume failed', e));

    }
    // Clean the URL so a refresh doesn't retrigger.
    const cleaned = new URLSearchParams(location.search);
    cleaned.delete('auto');
    cleaned.delete('plan');
    navigate(
      { pathname: location.pathname, search: cleaned.toString() ? `?${cleaned}` : '' },
      { replace: true },
    );
  }, [loading, authLoading, user, products, location.search, location.pathname, navigate, requestCheckout]);

  return (
    <div className="relative">

      {/* HERO */}
      {!compact && (
        <section className="relative overflow-hidden rounded-[20px] border-[1.5px] border-white/12">
          <div className="absolute inset-0">
            <img src={heroImg} alt="" className="h-full w-full object-cover" loading="eager" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#08080a]/95 via-[#08080a]/80 to-[#08080a]/60" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#08080a] via-transparent to-transparent" />
          </div>
          <div className="relative px-6 py-16 md:px-14 md:py-24 max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-orange-400/40 bg-orange-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-orange-200">
              Plans built for real operators
            </span>
            <h1 className="mt-5 text-4xl md:text-5xl font-semibold tracking-tight text-white leading-[1.05]">
              Plans for sellers and hosts — start free, upgrade when the math is obvious.
            </h1>
            <p className="mt-4 text-lg text-white/80 max-w-2xl leading-relaxed">
              Every plan serves both sides — selling a truck and hosting a kitchen live under one account. Free e-signatures on every agreement, at every tier.
            </p>
          </div>
        </section>
      )}

      {/* TOGGLE */}
      <div className="mt-10 flex flex-col items-center gap-3">
        <div className="inline-flex rounded-full border-[1.5px] border-white/12 bg-white/[0.03] p-1 backdrop-blur-sm">
          {(['monthly', 'annual'] as Interval[]).map((opt) => (
            <button
              key={opt}
              onClick={() => setInterval(opt)}
              className={cn(
                'relative rounded-full px-5 py-2 text-sm font-medium transition-all duration-300',
                interval === opt
                  ? 'bg-orange-500 text-white shadow-[0_4px_16px_-4px_rgba(251,146,60,0.5)]'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              aria-pressed={interval === opt}
            >
              {opt === 'monthly' ? 'Monthly' : 'Annual'}
              {opt === 'annual' && proSave && (
                <span className="ml-1.5 rounded-full bg-emerald-500/25 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-100">
                  Save {proSave}%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* TIER CARDS — 4-up on xl (Free + 3 paid) */}
      {loading ? (
        <div className="mt-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4 xl:items-start">
          {tiers.map((t, i) => {
            const groups = TIER_CATALOG[t.role];
            if (t.role === 'free') {
              return (
                <div key={t.role}>
                  <PremiumTierCard
                    role="free"
                    groups={groups}
                    interval={interval}
                    index={i}
                  />
                </div>
              );
            }
            // Exact cadence only — never silently bill a different interval
            // than the one shown on the toggle.
            const product = interval === 'annual' ? t.annual : t.monthly;
            const fallbackForCopy = t.monthly ?? t.annual;
            if (!product && !fallbackForCopy) return null;
            const paths = buildCheckoutReturnPaths((product ?? fallbackForCopy)!.slug);
            return (
              <div key={t.role} className={cn(t.role === 'pro' && 'xl:-my-3 xl:z-10')}>
                <PremiumTierCard
                  product={product}
                  priceReference={fallbackForCopy}
                  cadenceUnavailable={!product}
                  role={t.role}
                  groups={groups}
                  interval={interval}
                  successPath={successPathOverride ?? paths.successPath}
                  cancelPath={cancelPathOverride ?? paths.cancelPath}
                  index={i}
                />
              </div>
            );

          })}
        </div>
      )}

      {/* TRUST ROW */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Payment protection at checkout</span>
        <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-emerald-400" /> PayPal-secured billing</span>
        <span className="inline-flex items-center gap-1.5"><XCircle className="h-3.5 w-3.5 text-emerald-400" /> Cancel anytime online</span>
        <TrustESignChip variant="inline" label="Free e-signatures on every agreement" />
      </div>

      {!compact && (
        <>
          {/* TESTIMONIAL */}
          <section className="mt-14 rounded-[20px] border-[1.5px] border-white/12 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-8 md:p-10">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-300">What operators say</p>
              <blockquote className="mt-4 text-xl md:text-2xl leading-relaxed text-foreground font-medium">
                "Vendibook paid for itself in the first week. I stopped chasing tire-kickers on Facebook and started closing serious buyers who show up ready to sign."
              </blockquote>
              <footer className="mt-5 text-sm text-muted-foreground">
                <span className="text-foreground font-medium">Ryan A.</span> · Trailer seller, Lancaster CA
              </footer>
            </div>
          </section>

          {/* WEEKLY PASS — non-renewing 7-day Pro trial */}
          <ProWeeklyPassCard />

          {/* COMPARISON */}
          <section className="mt-10">
            <PlansComparisonTable />
            <FoundingMemberNote />
          </section>


          {/* FAQ */}
          <section className="mt-14">
            <PlansFAQ />
          </section>
        </>
      )}

      {/* STICKY MOBILE CTA */}
      {!compact && showStickyCta && tiers[1] && (
        <div className="fixed bottom-4 left-4 right-4 z-40 lg:hidden">
          <StickyPlanCta
            tier={growth ?? tiers[1]}
            interval={interval}
            successPathOverride={successPathOverride}
            cancelPathOverride={cancelPathOverride}
          />
        </div>
      )}

      {resumeDialog}
    </div>
  );
}


/**
 * Sticky mobile CTA. Starts the recommended (Growth) plan checkout directly at
 * the currently-selected cadence — never a dead scroll target. If that cadence
 * has no product it truthfully says so instead of substituting another.
 */
function StickyPlanCta({
  tier,
  interval,
  successPathOverride,
  cancelPathOverride,
}: {
  tier: { monthly?: MonetizationProduct; annual?: MonetizationProduct };
  interval: Interval;
  successPathOverride?: string;
  cancelPathOverride?: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { requestCheckout, dialog, pendingSlug } = useSubscriptionConsent();
  const product = interval === 'annual' ? tier.annual : tier.monthly;
  const busy = !!product && pendingSlug === product.slug;

  if (!product) {
    return (
      <div className="flex items-center justify-center rounded-full border-[1.5px] border-white/15 bg-black/80 px-5 py-3 text-sm font-medium text-white/70 backdrop-blur">
        {interval === 'annual' ? 'Annual billing unavailable' : 'Monthly billing unavailable'}
      </div>
    );
  }

  const perMonth = Math.round(
    effectivePriceCents(product) / (interval === 'annual' ? 1200 : 100),
  );

  const onClick = () => {
    if (busy) return;
    if (!user) {
      navigate(
        buildPlanAuthReturnTo({
          planSlug: product.slug,
          interval,
          pathname: location.pathname,
          search: location.search,
        }),
      );
      return;
    }
    const paths = buildCheckoutReturnPaths(product.slug);
    void requestCheckout(product, {
      interval,
      successPath: successPathOverride ?? paths.successPath,
      cancelPath: cancelPathOverride ?? paths.cancelPath,
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="flex w-full items-center justify-between rounded-full border-[1.5px] border-orange-400/60 bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgba(251,146,60,0.6)] disabled:opacity-80"
      >
        {busy ? (
          <span className="mx-auto inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Opening PayPal…
          </span>
        ) : (
          <>
            <span>Go Pro — recommended</span>
            <span className="tabular-nums">${perMonth}/mo</span>
          </>
        )}
      </button>
      {dialog}
    </>
  );
}

function FoundingMemberNote() {
  const { isGrandfathered, isLoading } = useListingQuota();
  if (isLoading || !isGrandfathered) return null;
  return (
    <p className="mt-3 text-xs text-emerald-500/90">
      You have unlimited listings as an early member — thank you.
    </p>
  );
}

export default PremiumPlansSection;
