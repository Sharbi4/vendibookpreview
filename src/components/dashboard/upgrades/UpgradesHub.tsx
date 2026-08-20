/**
 * UpgradesHub — the single "Upgrades & Premium Tools" area of the dashboard.
 *
 * Presentation only:
 *  - prices come from the live monetization catalog (`useCatalogPrice`)
 *  - access state comes from the existing entitlement hooks
 *    (`useHostEntitlements`, `useToolAccess`, `useEntitlements`,
 *     `usePermitPathAccess`, `useProBoostCredit`)
 *  - every CTA links to an existing purchase / tool surface
 *
 * No billing, checkout amounts or entitlement logic is defined here.
 *
 * Styling follows the premium light direction used on the redesigned for-sale
 * listing pages via the `.sale-light` scope: warm off-white canvas, white
 * cards, charcoal type, hairline borders, rounded-2xl/3xl, restrained ember.
 */
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  ClipboardCheck,
  ConciergeBell,
  Crown,
  FileText,
  Flame,
  Lock,
  PenLine,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TOOLS } from '@/lib/tools/catalog';
import { useToolAccess } from '@/hooks/useToolAccess';
import { useCatalogPrice } from '@/hooks/useCatalogPrices';
import { ACTIVE_PRODUCT_SLUGS } from '@/lib/monetization/catalogPricing';
import { useHostEntitlements } from '@/hooks/useHostEntitlements';
import { useEntitlements } from '@/hooks/useEntitlements';
import { usePermitPathAccess } from '@/hooks/usePermitPathAccess';
import { useProBoostCredit } from '@/hooks/useProBoostCredit';

const fmtDate = (iso?: string | null) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return null;
  }
};

const CARD =
  'rounded-2xl border border-[rgba(24,20,16,0.09)] bg-white p-4 sm:p-5';

const StateChip = ({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'ember' }) => (
  <span
    className={
      tone === 'ember'
        ? 'inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--brand-ember)/0.3)] bg-[hsl(var(--brand-ember)/0.08)] px-3 py-1.5 text-[12px] font-medium text-foreground'
        : 'inline-flex items-center gap-1.5 rounded-full border border-[rgba(24,20,16,0.1)] bg-[rgba(24,20,16,0.03)] px-3 py-1.5 text-[12px] font-medium text-foreground'
    }
  >
    <Check className="h-3.5 w-3.5 text-[hsl(var(--brand-ember))]" />
    {label}
  </span>
);

const IconBubble = ({ icon: Icon }: { icon: LucideIcon }) => (
  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgba(24,20,16,0.04)]">
    <Icon className="h-4 w-4 text-foreground" />
  </span>
);

/* ------------------------------------------------------------------ */
/* Membership                                                          */
/* ------------------------------------------------------------------ */

const MembershipHeader = () => {
  const { tier, planLabel, currentPeriodEnd, cancelAtPeriodEnd, isPastDue, isLoading } =
    useHostEntitlements();
  const pro = useCatalogPrice(ACTIVE_PRODUCT_SLUGS.vendibookPro);
  const { data: boostCredit } = useProBoostCredit();

  const isPro = tier === 'pro' || tier === 'premium';
  const renews = fmtDate(currentPeriodEnd);

  const statusLine = !isPro
    ? 'You are on the free plan. Listing and selling stay free — upgrades are optional.'
    : isPastDue
      ? 'Payment issue — update your billing method to keep Pro benefits.'
      : cancelAtPeriodEnd
        ? `Cancels at period end — full access until ${renews ?? 'period end'}.`
        : renews
          ? `Active · renews ${renews}`
          : 'Active';

  return (
    <section className={`${CARD} sm:p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <IconBubble icon={Crown} />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Your membership
            </p>
            <h2 className="mt-1 text-[19px] sm:text-[21px] font-semibold tracking-tight text-foreground">
              {isLoading ? 'Checking…' : isPro ? 'Vendibook Pro' : 'Free plan'}
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{statusLine}</p>
            {isPro && (
              <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                Plan on file: {planLabel}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {isPro ? (
            <Button asChild variant="outline" size="sm" className="rounded-xl">
              <Link to="/dashboard?view=host&tab=membership">Manage membership</Link>
            </Button>
          ) : (
            <Button asChild variant="cta" size="sm" className="gap-1">
              <Link to="/pricing">
                Upgrade to Pro · {pro.labelWithCadence}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {isPro && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-3">
          {[
            '10.9% seller & host fee (max $500 saved per transaction)',
            boostCredit
              ? 'Featured Boost credit available this period'
              : 'One Featured Boost credit each billing period',
            'All premium tools + PermitPath Plus included',
          ].map((b) => (
            <li
              key={b}
              className="flex items-start gap-2 rounded-xl bg-[rgba(24,20,16,0.03)] px-3 py-2.5 text-[12.5px] leading-relaxed text-foreground"
            >
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(var(--brand-ember))]" />
              {b}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* Premium tools                                                       */
/* ------------------------------------------------------------------ */

const PremiumToolsSection = () => {
  const access = useToolAccess();
  const permit = usePermitPathAccess();
  const permitPlus = useCatalogPrice(ACTIVE_PRODUCT_SLUGS.permitPathPlus);
  const isPro = access.hostTier === 'pro' || access.hostTier === 'premium';

  const stateFor = (slug: string): { label: string; tone: 'neutral' | 'ember' } | null => {
    const a = access.bySlug[slug];
    if (!a) return null;
    if (slug === 'permitpath') {
      if (!permit.isPlus) return null;
      if (permit.reason === 'included') return { label: 'Included with Vendibook Pro', tone: 'ember' };
      if (permit.reason === 'grandfathered') return { label: 'Included — founding member', tone: 'ember' };
      return { label: 'PermitPath Plus active', tone: 'neutral' };
    }
    if (!a.unlocked) return null;
    if (a.reason === 'subscription') return { label: 'Included with Vendibook Pro', tone: 'ember' };
    if (a.reason === 'purchase') return { label: 'Unlocked', tone: 'neutral' };
    if (a.reason === 'grandfathered') return { label: 'Included — founding member', tone: 'ember' };
    return { label: 'Free for everyone', tone: 'neutral' };
  };

  return (
    <section aria-labelledby="upgrades-tools">
      <header className="mb-3">
        <h2 id="upgrades-tools" className="text-[17px] font-semibold tracking-tight text-foreground">
          Premium tools
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          {isPro
            ? 'Everything below is part of your membership.'
            : 'Included with Vendibook Pro. Free tools stay open to everyone.'}
        </p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2">
        {TOOLS.map((tool) => {
          const a = access.bySlug[tool.slug];
          const state = stateFor(tool.slug);
          const open = !!a?.unlocked;
          const href = open ? tool.href : `/tools/${tool.slug}/preview`;
          const isPermit = tool.slug === 'permitpath';
          return (
            <li key={tool.slug} className={CARD}>
              <div className="flex gap-3">
                <IconBubble icon={tool.icon} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3 className="text-[15px] font-semibold text-foreground">{tool.name}</h3>
                    {!state && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(24,20,16,0.12)] px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        <Lock className="h-3 w-3" /> Vendibook Pro
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    {tool.tagline}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    {state ? (
                      <StateChip label={state.label} tone={state.tone} />
                    ) : isPermit ? (
                      <span className="text-[12.5px] text-muted-foreground">
                        Free roadmap · Plus {permitPlus.labelWithCadence}
                      </span>
                    ) : (
                      <span className="text-[12.5px] text-muted-foreground">
                        Included with Vendibook Pro
                      </span>
                    )}
                    <Button asChild variant="outline" size="sm" className="rounded-xl gap-1">
                      <Link to={href}>
                        {open ? 'Open' : isPermit ? 'Open PermitPath' : 'See what’s inside'}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {access.legacyPermitPath && (
        <p className="mt-3 flex items-center gap-2 rounded-2xl border border-[hsl(var(--brand-ember)/0.3)] bg-[hsl(var(--brand-ember)/0.06)] px-4 py-3 text-[13px] text-foreground">
          <Flame className="h-4 w-4 shrink-0 text-[hsl(var(--brand-ember))]" />
          <span>
            <span className="font-medium">Founding member.</span> You keep PermitPath Plus access at
            no cost.
          </span>
        </p>
      )}
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* One-time upgrades                                                   */
/* ------------------------------------------------------------------ */

interface AddOn {
  key: string;
  icon: LucideIcon;
  name: string;
  benefit: string;
  price: string;
  state: string | null;
  ctaLabel: string;
  href: string;
}

const OneTimeUpgrades = () => {
  const { bySlug, activePromotions = [] } = useEntitlements();
  const { tier } = useHostEntitlements();
  const { data: boostCredit } = useProBoostCredit();
  const isPro = tier === 'pro' || tier === 'premium';

  const boost = useCatalogPrice(ACTIVE_PRODUCT_SLUGS.featuredBoost);
  const proListing = useCatalogPrice(ACTIVE_PRODUCT_SLUGS.proListing);
  const concierge = useCatalogPrice(ACTIVE_PRODUCT_SLUGS.conciergeListing);
  const rewrite = useCatalogPrice(ACTIVE_PRODUCT_SLUGS.listingRewrite);

  const owns = (slug: string) => {
    const e = bySlug[slug];
    return !!e && ['paid', 'fulfilled', 'active'].includes(e.status);
  };

  const boostState = (() => {
    if (activePromotions.length > 0) {
      const ends = fmtDate(activePromotions[0]?.endsAt);
      return `${activePromotions.length} active${ends ? ` · ends ${ends}` : ''}`;
    }
    if (isPro && boostCredit) return 'Pro credit available this period';
    return null;
  })();

  const rows: AddOn[] = [
    {
      key: 'boost',
      icon: Zap,
      name: 'Featured Boost',
      benefit: 'Top-of-search placement and a highlighted card for 30 days.',
      price: boost.detailLabel,
      state: boostState,
      ctaLabel: 'Boost a listing',
      href: '/host/listings',
    },
    {
      key: 'pro-listing',
      icon: FileText,
      name: 'Pro Listing',
      benefit:
        'Premium presentation, priority placement, and an organic featured spot on Vendibook’s Facebook for 30 days.',
      price: proListing.detailLabel,
      state: owns(ACTIVE_PRODUCT_SLUGS.proListing) ? 'Active on your account' : null,
      ctaLabel: 'Choose a listing',
      href: '/host/listings',
    },
    {
      key: 'concierge',
      icon: ConciergeBell,
      name: 'Concierge Listing',
      benefit: 'Our team writes, structures and polishes your listing for you.',
      price: concierge.detailLabel,
      state: owns(ACTIVE_PRODUCT_SLUGS.conciergeListing) ? 'Purchased' : null,
      ctaLabel: 'Start concierge',
      href: '/list/concierge',
    },
    ...(rewrite.isActive
      ? [
          {
            key: 'rewrite',
            icon: PenLine,
            name: 'Listing Rewrite',
            benefit: 'A rewritten title, description and highlights for one listing.',
            price: rewrite.detailLabel,
            state: owns(ACTIVE_PRODUCT_SLUGS.listingRewrite) ? 'Purchased' : null,
            ctaLabel: 'Choose a listing',
            href: '/host/listings',
          } as AddOn,
        ]
      : []),
  ];

  return (
    <section aria-labelledby="upgrades-addons">
      <header className="mb-3">
        <h2 id="upgrades-addons" className="text-[17px] font-semibold tracking-tight text-foreground">
          One-time upgrades
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          Optional, per-listing purchases. Nothing here is required to list or sell.
        </p>
      </header>

      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.key} className={CARD}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <IconBubble icon={row.icon} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <h3 className="text-[15px] font-semibold text-foreground">{row.name}</h3>
                    <span className="text-[12.5px] text-muted-foreground">{row.price}</span>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    {row.benefit}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 sm:pl-3">
                {row.state && <StateChip label={row.state} />}
                <Button asChild variant={row.state ? 'outline' : 'cta'} size="sm" className="gap-1 rounded-xl">
                  <Link to={row.href}>
                    {row.state === 'Pro credit available this period' ? 'Use my boost credit' : row.ctaLabel}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

/* ------------------------------------------------------------------ */

export const UpgradesHub = () => (
  <div className="sale-light mx-auto max-w-[1080px] space-y-6 sm:space-y-8">
    <header>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Grow with Vendibook
      </p>
      <h1 className="mt-1.5 text-[24px] sm:text-[28px] font-semibold tracking-tight text-foreground">
        Upgrades &amp; premium tools
      </h1>
      <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
        What you already have, what comes with Vendibook Pro, and the optional add-ons you can buy
        per listing.
      </p>
    </header>

    <MembershipHeader />
    <hr className="border-[rgba(24,20,16,0.08)]" />
    <PremiumToolsSection />
    <hr className="border-[rgba(24,20,16,0.08)]" />
    <OneTimeUpgrades />

    <p className="pb-2 text-[12.5px] text-muted-foreground">
      Prices come from the live Vendibook catalog and match what you pay at checkout.
    </p>
  </div>
);

export default UpgradesHub;
