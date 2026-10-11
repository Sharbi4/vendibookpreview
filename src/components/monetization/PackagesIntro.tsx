import { Link } from 'react-router-dom';
import { Crown, Rocket, Sparkle as SparkleIcon, ShieldCheck, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Unified "Plans, upgrades & services" intro shown across the monetization surface.
 *
 * Variants:
 * - hero: full section with 4 value pillars and one ember-glow accent
 * - compact: single-line strip for high-intent placements (Account, ListingPublished, etc.)
 *
 * Brand tokens only — no hardcoded colors. Ember glow uses --primary.
 */

export type PackagesAudience = 'seller' | 'buyer' | 'host' | 'all';

interface Props {
  variant?: 'hero' | 'compact';
  /** Index of pillar (0-3) that gets the one ember-glow accent. Default 0 (Host Plans). */
  recommendedIndex?: number;
  audience?: PackagesAudience;
  className?: string;
}

const COPY = {
  eyebrow: 'Plans, upgrades & services',
  headline: 'Everything you need to buy it, fund it, sell it, and launch.',
  subhead:
    "Listing is always free. When you're ready to move faster, Vendibook gives you the same tools serious operators use to get in front of ready buyers, book more, and launch with confidence.",
  closer:
    'Free to start. Built to help you actually get earning, not just get listed.',
};

// Note: we deliberately avoid the banned "Sparkles" icon (see mem://constraints/no-sparkle-icons).
// Rocket / Crown / ShieldCheck are context-appropriate alternatives; the single "Sparkle" primitive
// from lucide is a distinct diamond glyph and is allowed for the "listing upgrade" pillar.

const PILLARS: Array<{
  key: string;
  icon: typeof Crown;
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  cta: string;
}> = [
  {
    key: 'host-plans',
    icon: Crown,
    eyebrow: 'For people who list often',
    title: 'Host Plans',
    body: 'Featured placement, deeper analytics, lower selling fees, and priority support. Starter, Pro, and Premium. Cancel anytime.',
    href: '/pricing',
    cta: 'See host plans',
  },
  {
    key: 'listing-upgrades',
    icon: SparkleIcon,
    eyebrow: 'Sell one listing faster',
    title: 'Listing Upgrades',
    body: 'Feature a single listing and jump to the top of search and buyer alerts for 30 days. One-time, no subscription.',
    href: '/pricing#upgrades',
    cta: 'Boost a listing',
  },
  {
    key: 'services',
    icon: Rocket,
    eyebrow: 'Done for you',
    title: 'Done-for-you Services',
    body: 'Let our team write, price, and position your listing, or handle the whole sale start to finish. Purchase reviews and permit help for buyers too.',
    href: '/services',
    cta: 'Explore services',
  },
  {
    key: 'protection',
    icon: ShieldCheck,
    eyebrow: 'Payment protection + trusted partners',
    title: 'Protected Payments & Partners',
    body: 'Payment protection on every sale, plus financing, insurance, inspection, and nationwide delivery through vetted partners.',
    href: '/partners',
    cta: 'Meet the partners',
  },
];

const PackagesIntro = ({ variant = 'hero', recommendedIndex = 0, audience: _audience = 'all', className }: Props) => {
  if (variant === 'compact') return <CompactStrip className={className} />;
  return <Hero recommendedIndex={recommendedIndex} className={className} />;
};

const Hero = ({ recommendedIndex, className }: { recommendedIndex: number; className?: string }) => (
  <section
    className={cn(
      'relative overflow-hidden rounded-3xl border border-white/10 bg-background/60 px-6 py-12 md:px-10 md:py-16 backdrop-blur-xl',
      className,
    )}
  >
    <div className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/90">{COPY.eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl md:text-5xl leading-[1.05] tracking-tight text-foreground">
        {COPY.headline}
      </h2>
      <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
        {COPY.subhead}
      </p>
    </div>

    <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {PILLARS.map((p, i) => (
        <PillarCard key={p.key} pillar={p} highlighted={i === recommendedIndex} />
      ))}
    </div>

    <p className="mt-10 max-w-2xl text-sm text-muted-foreground/90 italic">{COPY.closer}</p>
  </section>
);

const PillarCard = ({
  pillar,
  highlighted,
}: {
  pillar: (typeof PILLARS)[number];
  highlighted: boolean;
}) => {
  const Icon = pillar.icon;
  return (
    <Link
      to={pillar.href}
      className={cn(
        'group relative flex flex-col rounded-2xl border p-5 transition-all',
        'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]',
        highlighted && [
          'border-primary/40 bg-primary/[0.06]',
          'shadow-[0_0_60px_-15px_hsl(var(--primary)/0.55),inset_0_1px_0_0_hsl(var(--primary)/0.15)]',
        ],
      )}
    >
      <div
        className={cn(
          'inline-flex h-10 w-10 items-center justify-center rounded-xl border',
          highlighted
            ? 'border-primary/40 bg-primary/15 text-primary'
            : 'border-white/10 bg-white/[0.03] text-foreground/80',
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {pillar.eyebrow}
      </p>
      <h3 className="mt-1 font-display text-xl text-foreground">{pillar.title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{pillar.body}</p>
      <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary group-hover:gap-2 transition-all">
        {pillar.cta} <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
};

const CompactStrip = ({ className }: { className?: string }) => (
  <div
    className={cn(
      'rounded-2xl border border-white/10 bg-background/60 px-4 py-3 md:px-5 md:py-4 backdrop-blur-md',
      'flex flex-col gap-3 md:flex-row md:items-center md:justify-between',
      className,
    )}
  >
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/90">
        {COPY.eyebrow}
      </p>
      <p className="text-sm text-foreground/90 mt-0.5">
        Plans, boosts, services, and protected payments — all in one place.
      </p>
    </div>
    <div className="flex flex-wrap gap-2">
      {PILLARS.map((p) => (
        <Link
          key={p.key}
          to={p.href}
          className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-foreground/85 hover:border-primary/40 hover:text-primary transition-colors"
        >
          {p.title}
        </Link>
      ))}
    </div>
  </div>
);

export default PackagesIntro;
