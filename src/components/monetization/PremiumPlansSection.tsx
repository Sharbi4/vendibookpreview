import { useEffect, useMemo, useState } from 'react';
import { Loader2, ShieldCheck, XCircle, Lock } from 'lucide-react';
import { useMonetizationProducts } from '@/hooks/useMonetizationProducts';
import { buildCheckoutReturnPaths } from '@/lib/monetization/returnRoutes';
import { effectivePriceCents, type MonetizationProduct } from '@/lib/monetization/products';
import { cn } from '@/lib/utils';
import PremiumTierCard from './PremiumTierCard';
import PlansComparisonTable from './PlansComparisonTable';
import PlansFAQ from './PlansFAQ';
import ProWeeklyPassCard from './ProWeeklyPassCard';

import heroImg from '@/assets/trailer-orange-grill.jpg';

type Interval = 'monthly' | 'annual';

const TIER_MAP: Array<{
  role: 'starter' | 'pro' | 'premium';
  base: string;
  tagline: string;
  audience: string;
  cta: string;
  breakEven?: string;
}> = [
  { role: 'starter', base: 'host_starter', tagline: 'List like a pro.', audience: 'For occasional hosts and sellers.', cta: 'Start with Starter' },
  { role: 'pro', base: 'host_growth', tagline: 'Sell and book faster.', audience: 'For active hosts running the show.', cta: 'Go Pro' },
  { role: 'premium', base: 'host_operator', tagline: 'Run your whole operation.', audience: 'For fleets, kitchens, and multi-location teams.', cta: 'Talk business — go Premium' },
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
}

export function PremiumPlansSection({ compact = false }: Props) {
  const { products, loading } = useMonetizationProducts('host_subscription');
  const [interval, setInterval] = useState<Interval>('monthly');
  const [showStickyCta, setShowStickyCta] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowStickyCta(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const tiers = useMemo(() =>
    TIER_MAP.map(t => ({ ...t, ...pair(products, t.base) })),
  [products]);

  const proSave = savingsPct(tiers[1]?.monthly, tiers[1]?.annual);

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
              The tools professional hosts use to book faster and earn more.
            </h1>
            <p className="mt-4 text-lg text-white/80 max-w-2xl leading-relaxed">
              Every plan is designed around one outcome — more paid bookings, less busywork. Start free, upgrade when the math is obvious.
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

      {/* TIER CARDS */}
      {loading ? (
        <div className="mt-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="mt-10 grid gap-6 lg:grid-cols-3 lg:items-start">
          {tiers.map((t, i) => {
            const product = interval === 'annual' ? (t.annual ?? t.monthly) : (t.monthly ?? t.annual);
            if (!product) return null;
            const paths = buildCheckoutReturnPaths(product.slug);
            return (
              <div key={t.role} className={cn(t.role === 'pro' && 'lg:-my-3 lg:z-10')}>
                <PremiumTierCard
                  product={product}
                  role={t.role}
                  tagline={t.tagline}
                  audience={t.audience}
                  ctaLabel={t.cta}
                  breakEven={t.breakEven}
                  interval={interval}
                  successPath={paths.successPath}
                  cancelPath={paths.cancelPath}
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
        <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-emerald-400" /> Stripe-secured billing</span>
        <span className="inline-flex items-center gap-1.5"><XCircle className="h-3.5 w-3.5 text-emerald-400" /> Cancel anytime online</span>
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
          <a
            href="#tier-pro"
            onClick={(e) => { e.preventDefault(); document.querySelectorAll('button').forEach(() => {}); window.scrollTo({ top: 700, behavior: 'smooth' }); }}
            className="flex items-center justify-between rounded-full border-[1.5px] border-orange-400/60 bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgba(251,146,60,0.6)]"
          >
            <span>Go Pro — recommended</span>
            <span className="tabular-nums">${Math.round(effectivePriceCents(interval === 'annual' ? (tiers[1].annual ?? tiers[1].monthly)! : tiers[1].monthly!) / (interval === 'annual' ? 1200 : 100))}/mo</span>
          </a>
        </div>
      )}
    </div>
  );
}

export default PremiumPlansSection;
