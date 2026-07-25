import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Loader2, ArrowRight, Flame, TrendingUp, ShoppingBag, Home, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  effectivePriceCents,
  formatUsd,
  type MonetizationProduct,
} from '@/lib/monetization/products';
import { trackLeadEvent } from '@/lib/leadTracking';
import { useSubscriptionConsent } from '@/hooks/useSubscriptionConsent';
import {
  ProductLearnMoreOverlay,
  useLearnMoreDeepLink,
} from '@/components/monetization/ProductLearnMoreOverlay';
import { TrustESignChip } from '@/components/trust/TrustESignChip';
import type { TierFeatureGroups, TierRole } from './tierCatalog';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  /** Required for paid tiers; ignored for free tier. */
  product?: MonetizationProduct;
  role: TierRole;
  /** Grouped feature copy (For sellers / For hosts / shared). */
  groups: TierFeatureGroups;
  interval: 'monthly' | 'annual';
  successPath?: string;
  cancelPath?: string;
  index?: number;
  breakEven?: string;
}

function useCountUp(target: number, active: boolean, duration = 700) {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>();
  const prefersReduced = typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!active) return;
    if (prefersReduced) { setValue(target); return; }
    startRef.current = null;
    const step = (t: number) => {
      if (startRef.current == null) startRef.current = t;
      const p = Math.min(1, (t - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, active, duration, prefersReduced]);

  return value;
}

const roleStyles: Record<TierRole, { badge: string; ring: string; cta: string; accent: string }> = {
  free: {
    badge: '',
    ring: 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]',
    cta: 'bg-white/[0.06] hover:bg-white/[0.10] text-foreground border border-white/12',
    accent: 'text-foreground/70',
  },
  starter: {
    badge: '',
    ring: 'border-white/12 bg-white/[0.03] hover:bg-white/[0.05]',
    cta: 'bg-white/[0.06] hover:bg-white/[0.1] text-foreground border border-white/12',
    accent: 'text-foreground/80',
  },
  pro: {
    badge: 'bg-gradient-to-r from-orange-500 to-orange-400 text-white',
    ring: 'border-orange-400/60 bg-gradient-to-b from-orange-500/[0.06] to-transparent shadow-[0_0_0_1.5px_rgba(251,146,60,0.25),0_20px_60px_-20px_rgba(251,146,60,0.45)]',
    cta: 'bg-orange-500 hover:bg-orange-500/90 text-white',
    accent: 'text-orange-300',
  },
  premium: {
    badge: '',
    ring: 'border-white/15 bg-white/[0.04] hover:bg-white/[0.06]',
    cta: 'bg-white text-black hover:bg-white/90',
    accent: 'text-foreground/90',
  },
};

function FeatureGroup({
  icon: Icon,
  heading,
  items,
  role,
  visible,
  baseDelay,
}: {
  icon: typeof ShoppingBag;
  heading: string;
  items: string[];
  role: TierRole;
  visible: boolean;
  baseDelay: number;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <Icon className="h-3 w-3" />
        <span>{heading}</span>
      </div>
      <ul className="mt-2 space-y-2 text-sm">
        {items.map((f, i) => (
          <li
            key={f}
            className={cn(
              'flex items-start gap-2.5 transition-all duration-500',
              visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2',
            )}
            style={{ transitionDelay: `${baseDelay + i * 45}ms` }}
          >
            <span className={cn(
              'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
              role === 'pro' ? 'bg-orange-500/15 text-orange-300' : 'bg-white/[0.06] text-foreground/80',
            )}>
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span className="text-foreground/90 leading-snug">{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PremiumTierCard({
  product, role, groups, interval,
  successPath, cancelPath, index = 0, breakEven,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const isFree = role === 'free';
  const priceCents = product ? effectivePriceCents(product) : 0;
  const perMonthCents = interval === 'annual' ? Math.round(priceCents / 12) : priceCents;
  const animatedDollars = useCountUp(Math.round(perMonthCents / 100), visible);
  const { requestCheckout, dialog: consentDialog, pendingSlug } = useSubscriptionConsent();
  const activeBusy = busy || (product ? pendingSlug === product.slug : false);
  const styles = roleStyles[role];

  const learnDeepLink = useLearnMoreDeepLink(product?.slug ?? role);
  const [learnOpenManual, setLearnOpenManual] = useState(false);
  const learnOpen = learnDeepLink.open || learnOpenManual;
  const setLearnOpen = (v: boolean) => {
    setLearnOpenManual(v);
    learnDeepLink.setOpen(v);
  };

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); io.disconnect(); }
    }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const handleClick = async () => {
    if (isFree || !product) return;
    try {
      trackLeadEvent('checkout_started', {
        product_slug: product.slug,
        surface: 'premium_tier_card',
      });
      await requestCheckout(product, { successPath, cancelPath });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Could not start checkout');
    } finally {
      setBusy(false);
    }
  };

  const freeHref = user ? '/dashboard' : '/auth?returnTo=/list-your-space';

  return (
    <div
      ref={cardRef}
      className={cn(
        'group relative flex flex-col rounded-[20px] border-[1.5px] p-6 backdrop-blur-sm transition-all duration-500 ease-out',
        'motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-2xl',
        styles.ring,
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
      )}
      style={{ transitionDelay: `${index * 90}ms` }}
    >
      {role === 'pro' && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider shadow-lg',
            styles.badge,
            'motion-safe:animate-[pulse_3s_ease-in-out_infinite]',
          )}>
            <Flame className="h-3 w-3" /> Recommended
          </span>
        </div>
      )}

      <div className="flex items-baseline justify-between">
        <h3 className="text-xl font-semibold text-foreground">{groups.name}</h3>
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{role === 'pro' ? 'Growth' : role}</span>
      </div>
      <p className="mt-1 text-sm text-foreground/85 font-medium">{groups.tagline}</p>
      <p className="mt-1 text-xs text-muted-foreground">{groups.audience}</p>

      <div className="mt-5 flex items-end gap-1.5">
        {isFree ? (
          <>
            <span className="text-5xl font-bold tracking-tight text-foreground tabular-nums">$0</span>
            <span className="pb-1.5 text-sm text-muted-foreground">forever</span>
          </>
        ) : (
          <>
            <span className="text-5xl font-bold tracking-tight text-foreground tabular-nums">${animatedDollars}</span>
            <span className="pb-1.5 text-sm text-muted-foreground">
              /mo{interval === 'annual' && <span className="block text-[11px] leading-none">billed annually</span>}
            </span>
          </>
        )}
      </div>

      {breakEven && !isFree && (
        <div className="mt-3 inline-flex items-center gap-1.5 self-start rounded-md border-[1.5px] border-emerald-400/25 bg-emerald-500/[0.06] px-2.5 py-1 text-[11px] text-emerald-200">
          <TrendingUp className="h-3 w-3" /> {breakEven}
        </div>
      )}

      {/* Standard trust: free e-sign on every plan */}
      <div className="mt-4">
        <TrustESignChip variant="row" label="Free e-signatures on every agreement" />
      </div>

      <div className="mt-5 space-y-4">
        <FeatureGroup
          icon={ShoppingBag}
          heading="For sellers"
          items={groups.sellers}
          role={role}
          visible={visible}
          baseDelay={index * 90 + 220}
        />
        <FeatureGroup
          icon={Home}
          heading="For hosts"
          items={groups.hosts}
          role={role}
          visible={visible}
          baseDelay={index * 90 + 340}
        />
        <FeatureGroup
          icon={Users}
          heading="Everyone"
          items={groups.shared}
          role={role}
          visible={visible}
          baseDelay={index * 90 + 460}
        />
      </div>

      <div className="mt-6 flex-1" />

      {isFree ? (
        <Button asChild className={cn('w-full h-11 rounded-md text-sm font-semibold', styles.cta)}>
          <Link to={freeHref}>
            {groups.ctaLabel} <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      ) : (
        <Button
          onClick={handleClick}
          disabled={activeBusy || !product}
          className={cn('w-full h-11 rounded-md text-sm font-semibold', styles.cta)}
        >
          {activeBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>{groups.ctaLabel} <ArrowRight className="ml-1.5 h-4 w-4" /></>
          )}
        </Button>
      )}

      <button
        type="button"
        onClick={() => setLearnOpen(true)}
        className="mt-2 text-center text-xs font-medium text-white/60 hover:text-white/90 underline-offset-4 hover:underline"
      >
        Learn more about {groups.name}
      </button>

      {!isFree && (
        <p className="mt-3 text-[11px] text-muted-foreground text-center">
          Cancel anytime online. Auto-renews at {formatUsd(priceCents)} / {interval === 'annual' ? 'yr' : 'mo'} until canceled.
        </p>
      )}
      {isFree && (
        <p className="mt-3 text-[11px] text-muted-foreground text-center">
          No card required. Upgrade anytime from your dashboard.
        </p>
      )}

      {consentDialog}
      {product && (
        <ProductLearnMoreOverlay
          open={learnOpen}
          onOpenChange={setLearnOpen}
          product={product}
          surface={`premium_tier_card:${role}`}
          billingLabel={interval === 'annual' ? '/yr' : '/mo'}
          ctaLabel={groups.ctaLabel}
          ctaBusy={activeBusy}
          onBuy={async () => {
            setLearnOpen(false);
            await handleClick();
          }}
        />
      )}
    </div>
  );
}

export default PremiumTierCard;
