import { useEffect, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ShieldCheck,
  Lock,
  FileSignature,
  BadgeCheck,
  MapPin,
  ArrowLeft,
  ArrowRight,
  Truck,
  UserCheck,
  ClipboardCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import SmartImage from '@/components/ui/SmartImage';
import { StripeLogo } from '@/components/ui/StripeLogo';
import { AffirmBadge } from '@/components/ui/AffirmBadge';
import {
  trackCheckoutIntroViewed,
  trackCheckoutIntroContinued,
} from '@/lib/analytics';

export type CheckoutIntroFlow = 'sale' | 'rental';

export interface CheckoutIntroProps {
  listingId: string;
  listingTitle: string;
  coverImageUrl?: string | null;
  city?: string | null;
  state?: string | null;
  price: number;
  priceSuffix?: string; // e.g. "/day" for rentals
  sellerName?: string | null;
  sellerVerified?: boolean;
  flow: CheckoutIntroFlow;
  financingEligible?: boolean;
  onContinue: () => void;
  onBack: () => void;
}

const priceFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const CheckoutIntro = ({
  listingId,
  listingTitle,
  coverImageUrl,
  city,
  state,
  price,
  priceSuffix,
  sellerName,
  sellerVerified,
  flow,
  financingEligible,
  onContinue,
  onBack,
}: CheckoutIntroProps) => {
  const reduce = useReducedMotion();

  useEffect(() => {
    trackCheckoutIntroViewed({ listingId, flow, price });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId, flow]);

  const beats = useMemo(
    () =>
      flow === 'sale'
        ? [
            {
              icon: Truck,
              title: 'Choose how you\u2019ll get it',
              body: 'Pickup, delivery, or freight \u2014 with real cost estimates before you commit.',
            },
            {
              icon: UserCheck,
              title: 'Confirm your details',
              body: 'Only what we need for the bill of sale and to coordinate handoff.',
            },
            {
              icon: ClipboardCheck,
              title: 'Review everything, then pay',
              body: 'Full itemized breakdown, plain-English terms, one clear agreement.',
            },
          ]
        : [
            {
              icon: Truck,
              title: 'Pick your dates and fulfillment',
              body: 'See the full cost \u2014 nightly rate, deposit, and fees \u2014 as you choose.',
            },
            {
              icon: UserCheck,
              title: 'Confirm your details',
              body: 'Only what the host needs to prepare and coordinate your booking.',
            },
            {
              icon: ClipboardCheck,
              title: 'Review everything, then pay',
              body: 'Deposit, cleaning fee, and cancellation policy shown up front.',
            },
          ],
    [flow],
  );

  const trustPoints = useMemo(() => {
    const points: Array<{ icon: typeof ShieldCheck; label: string; kind?: 'stripe' }> = [
      {
        icon: ShieldCheck,
        label:
          flow === 'sale'
            ? 'Your payment is protected until you confirm delivery'
            : 'Your payment is protected until check-in is confirmed',
      },
      { icon: Lock, label: 'Secured by Stripe', kind: 'stripe' },
      { icon: FileSignature, label: 'Bill of sale e-signed free' },
    ];
    if (sellerVerified) {
      points.push({ icon: BadgeCheck, label: 'Verified seller' });
    }
    return points;
  }, [flow, sellerVerified]);

  const ctaLabel = flow === 'sale' ? 'Start your purchase' : 'Start your booking';
  const location = [city, state].filter(Boolean).join(', ');
  const heroTitleNoun = listingTitle || (flow === 'sale' ? 'purchase' : 'booking');

  const stagger = reduce ? 0 : 0.06;
  const dur = reduce ? 0 : 0.35;

  const handleContinue = () => {
    trackCheckoutIntroContinued({ listingId, flow, price });
    onContinue();
  };

  return (
    <div className="mx-auto max-w-3xl">
      {/* HERO */}
      <motion.div
        initial={{ opacity: 0, y: reduce ? 0 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: dur }}
        className="relative overflow-hidden rounded-2xl border-[1.5px] border-white/10"
      >
        <SmartImage
          src={coverImageUrl}
          alt={listingTitle}
          aspect="3/2"
          priority
          radiusClass="rounded-2xl"
          wrapperClassName="w-full"
        />
        {/* Legibility gradient */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            background:
              'linear-gradient(180deg, rgba(6,6,8,0) 40%, rgba(6,6,8,0.55) 72%, rgba(6,6,8,0.92) 100%)',
          }}
        />
        {/* Overlay content */}
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h1 className="font-display text-xl sm:text-2xl font-semibold text-white leading-tight truncate">
                {listingTitle}
              </h1>
              {location && (
                <div className="mt-1 flex items-center gap-1.5 text-[13px] text-white/75">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="truncate">{location}</span>
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="font-display text-xl sm:text-2xl font-semibold text-white tabular-nums">
                {priceFmt.format(price)}
                {priceSuffix && (
                  <span className="text-sm font-medium text-white/70">{priceSuffix}</span>
                )}
              </div>
              {sellerName && (
                <div className="mt-1 flex items-center justify-end gap-1 text-[12px] text-white/75">
                  {sellerVerified && <BadgeCheck className="h-3.5 w-3.5 text-emerald-400" />}
                  <span className="truncate">{sellerName}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* HEADLINE */}
      <motion.div
        initial={{ opacity: 0, y: reduce ? 0 : 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: dur, delay: stagger }}
        className="mt-6 sm:mt-8 text-center"
      >
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-foreground leading-tight">
          Let&rsquo;s get your{' '}
          <span className="text-primary">{heroTitleNoun}</span>
        </h2>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">
          {flow === 'sale' ? 'Five' : 'Four'} quick steps. We&rsquo;ll explain everything before you pay.
        </p>
      </motion.div>

      {/* BEATS */}
      <div className="mt-6 sm:mt-8 grid gap-3 sm:grid-cols-3">
        {beats.map((b, i) => {
          const Icon = b.icon;
          return (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: reduce ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: dur, delay: stagger * (2 + i) }}
              className="rounded-xl border-[1.5px] border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md border-[1.5px] border-white/10 bg-white/5 text-foreground/80">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground tabular-nums">
                  Step {i + 1}
                </div>
              </div>
              <div className="mt-3 text-sm font-semibold text-foreground leading-snug">
                {b.title}
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">
                {b.body}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* TRUST ROW */}
      <motion.div
        initial={{ opacity: 0, y: reduce ? 0 : 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: dur, delay: stagger * (2 + beats.length) }}
        className="mt-6 sm:mt-8 rounded-xl border-[1.5px] border-white/10 bg-[rgba(11,15,18,0.5)] p-4"
      >
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {trustPoints.map((p) => {
            const Icon = p.icon;
            return (
              <li key={p.label} className="flex items-start gap-2 text-[13px] text-foreground/85">
                {p.kind === 'stripe' ? (
                  <StripeLogo size="xs" className="mt-0.5" />
                ) : (
                  <Icon className="mt-0.5 h-4 w-4 text-primary" strokeWidth={1.75} />
                )}
                <span className="leading-relaxed">{p.label}</span>
              </li>
            );
          })}
        </ul>
      </motion.div>

      {/* FINANCING LINE */}
      {financingEligible && flow === 'sale' && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: dur, delay: stagger * (3 + beats.length) }}
          className="mt-4 flex items-center justify-center gap-2 text-[12px] text-muted-foreground"
        >
          <span>Or pay monthly with</span>
          <AffirmBadge price={price} className="h-4" showTooltip={false} />
          <span>&mdash; we&rsquo;ll show options at payment.</span>
        </motion.p>
      )}

      {/* CTA ROW */}
      <motion.div
        initial={{ opacity: 0, y: reduce ? 0 : 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: dur, delay: stagger * (4 + beats.length) }}
        className="mt-6 sm:mt-8 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <Button
          variant="ghost"
          className="h-11 rounded-lg text-muted-foreground hover:text-foreground gap-2"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to listing
        </Button>
        <Button
          size="lg"
          className="h-12 rounded-lg px-6 font-semibold gap-2 shadow-cta-primary"
          onClick={handleContinue}
        >
          {ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </motion.div>
    </div>
  );
};

export default CheckoutIntro;
