/**
 * UpgradesPanel — the single Upgrades / Premium Tools area in the dashboard.
 *
 * Presentation only: prices come from the monetization catalog
 * (`useCatalogPrice`), access state comes from existing entitlement hooks, and
 * every action links to an existing purchase surface. No billing, checkout or
 * entitlement logic lives here.
 *
 * Styling matches the redesigned for-sale pages via the `.sale-light` scope:
 * warm off-white canvas, white cards, charcoal type, hairline gray borders,
 * rounded corners and restrained Vendibook orange.
 */
import { Link } from 'react-router-dom';
import { Crown, Zap, FileText, ConciergeBell, ClipboardCheck, Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCatalogPrice } from '@/hooks/useCatalogPrices';
import { ACTIVE_PRODUCT_SLUGS } from '@/lib/monetization/catalogPricing';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useHostEntitlements } from '@/hooks/useHostEntitlements';
import { usePermitPathAccess } from '@/hooks/usePermitPathAccess';
import { useProBoostCredit } from '@/hooks/useProBoostCredit';

const fmtDate = (iso?: string | null) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return null;
  }
};

type Row = {
  key: string;
  icon: typeof Crown;
  name: string;
  benefit: string;
  price: string;
  /** Non-null when the member already has it — shown instead of a CTA. */
  state: string | null;
  ctaLabel: string;
  href: string;
};

const StateChip = ({ label }: { label: string }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(24,20,16,0.1)] bg-[rgba(24,20,16,0.03)] px-3 py-1.5 text-[12px] font-medium text-foreground">
    <Check className="h-3.5 w-3.5 text-[hsl(var(--brand-ember))]" />
    {label}
  </span>
);

export const UpgradesPanel = () => {
  const { tier, currentPeriodEnd, cancelAtPeriodEnd, isPastDue, isLoading: tierLoading } =
    useHostEntitlements();
  const { bySlug, activePromotions = [] } = useEntitlements();
  const permit = usePermitPathAccess();
  const { data: boostCredit } = useProBoostCredit();

  const pro = useCatalogPrice(ACTIVE_PRODUCT_SLUGS.vendibookPro);
  const boost = useCatalogPrice(ACTIVE_PRODUCT_SLUGS.featuredBoost);
  const proListing = useCatalogPrice(ACTIVE_PRODUCT_SLUGS.proListing);
  const concierge = useCatalogPrice(ACTIVE_PRODUCT_SLUGS.conciergeListing);
  const permitPlus = useCatalogPrice(ACTIVE_PRODUCT_SLUGS.permitPathPlus);

  const isPro = tier === 'pro' || tier === 'premium';
  const renews = fmtDate(currentPeriodEnd);

  const proState = !isPro
    ? null
    : isPastDue
      ? 'Payment issue — update billing'
      : cancelAtPeriodEnd
        ? `Active until ${renews ?? 'period end'}`
        : renews
          ? `Active · renews ${renews}`
          : 'Active';

  const boostState = (() => {
    if (activePromotions.length > 0) {
      const ends = fmtDate(activePromotions[0]?.endsAt);
      return `${activePromotions.length} active${ends ? ` · ends ${ends}` : ''}`;
    }
    if (boostCredit) return 'Pro credit available this period';
    return null;
  })();

  const hasPurchase = (slug: string) => {
    const e = bySlug[slug];
    return !!e && ['paid', 'fulfilled', 'active'].includes(e.status);
  };

  const permitState = permit.isPlus
    ? permit.reason === 'included'
      ? 'Included with Vendibook Pro'
      : permit.reason === 'grandfathered'
        ? 'Included — founding member'
        : 'Active'
    : null;

  const rows: Row[] = [
    {
      key: 'pro',
      icon: Crown,
      name: 'Vendibook Pro',
      benefit: '10.9% seller/host fee, monthly Featured Boost credit, all premium tools.',
      price: pro.labelWithCadence,
      state: proState,
      ctaLabel: 'Go Pro',
      href: '/pricing',
    },
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
      benefit: 'Premium listing presentation and priority placement for 30 days.',
      price: proListing.detailLabel,
      state: hasPurchase(ACTIVE_PRODUCT_SLUGS.proListing) ? 'Purchased' : null,
      ctaLabel: 'Add Pro Listing',
      href: '/pricing',
    },
    {
      key: 'concierge',
      icon: ConciergeBell,
      name: 'Concierge Listing',
      benefit: 'Our team writes, structures and polishes your listing for you.',
      price: concierge.detailLabel,
      state: hasPurchase(ACTIVE_PRODUCT_SLUGS.conciergeListing) ? 'Purchased' : null,
      ctaLabel: 'Start concierge',
      href: '/list/concierge',
    },
    {
      key: 'permit-plus',
      icon: ClipboardCheck,
      name: 'PermitPath Plus',
      benefit: 'Save roadmaps, track permit progress, store documents and export PDFs.',
      price: permitPlus.labelWithCadence,
      state: permitState,
      ctaLabel: 'Unlock Plus',
      href: '/tools/permit-path',
    },
  ];

  return (
    <section
      aria-label="Upgrades and premium tools"
      className="sale-light rounded-3xl border border-[rgba(24,20,16,0.09)] p-4 sm:p-6 shadow-[0_1px_2px_rgba(24,20,16,0.04),0_16px_40px_-28px_rgba(24,20,16,0.4)]"
    >
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Upgrades
        </p>
        <h2 className="mt-1.5 text-[20px] sm:text-[22px] font-semibold tracking-tight text-foreground">
          Premium tools &amp; add-ons
        </h2>
        <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
          Everything you can add to your account, with your current access shown.
        </p>
      </header>

      <ul className="mt-5 space-y-3">
        {rows.map((row) => {
          const Icon = row.icon;
          const owned = !!row.state;
          return (
            <li
              key={row.key}
              className="rounded-2xl border border-[rgba(24,20,16,0.09)] bg-white p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgba(24,20,16,0.04)]">
                    <Icon className="h-4.5 w-4.5 text-foreground" />
                  </span>
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

                <div className="shrink-0 sm:pl-3">
                  {owned ? (
                    <StateChip label={row.state as string} />
                  ) : (
                    <Button asChild variant="cta" size="sm" className="gap-1">
                      <Link to={row.href}>
                        {row.ctaLabel}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {!tierLoading && isPro && (
        <p className="mt-4 text-[12.5px] text-muted-foreground">
          Manage your membership in{' '}
          <Link
            to="/dashboard?view=host&tab=membership"
            className="font-medium text-foreground underline underline-offset-2"
          >
            Membership
          </Link>
          .
        </p>
      )}
    </section>
  );
};

export default UpgradesPanel;
