/**
 * /pricing (also served at /plans) — the single pricing source of truth.
 *
 * Presentation only. Prices come from the monetization catalog
 * (`monetization_products`, the same rows PayPal is charged against) and every
 * purchase goes through the existing checkout helpers — no billing, PayPal or
 * entitlement logic is defined here.
 *
 * Styling follows the current /how-it-works and for-sale listing-detail
 * system: the `.sale-light` scope (warm ivory canvas, white editorial
 * surfaces, charcoal type, hairline borders), the shared CTA button variants
 * (`cta` / `cta-outline` at `size="cta"`), and the restrained once-only
 * fade/slide motion pattern.
 */
import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, ArrowUpRight, Check, Loader2, Lock, ShieldCheck, XCircle,
} from 'lucide-react';
import SEO from '@/components/SEO';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useMonetizationProducts } from '@/hooks/useMonetizationProducts';
import { useSubscriptionConsent } from '@/hooks/useSubscriptionConsent';
import { useHostEntitlements } from '@/hooks/useHostEntitlements';
import { usePermitPathAccess } from '@/hooks/usePermitPathAccess';
import {
  effectivePriceCents,
  formatUsd,
  startMonetizationCheckout,
  type MonetizationProduct,
} from '@/lib/monetization/products';
import {
  ACTIVE_PRODUCT_SLUGS,
  isRetiredProduct,
} from '@/lib/monetization/catalogPricing';
import {
  buildCheckoutReturnPaths,
  buildPlanAuthReturnTo,
} from '@/lib/monetization/returnRoutes';
import { trackLeadEvent } from '@/lib/leadTracking';
import PlansFAQ from '@/components/monetization/PlansFAQ';
import PlanDetailsDialog from '@/components/monetization/PlanDetailsDialog';

/** Once-only editorial motion, identical to /how-it-works. */
const ease = [0.22, 1, 0.36, 1] as const;
const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.45, ease },
};

const CARD_SHADOW =
  'shadow-[0_1px_2px_rgba(24,20,16,0.04),0_10px_28px_-18px_rgba(24,20,16,0.28)]';

/** Learn-more copy per add-on. Prices/cadence stay dynamic from the catalog. */
const ADDON_DETAILS: Record<
  string,
  { summary: string; included: string[]; bestFor: string; billing: string; finePrint: string[] }
> = {
  [ACTIVE_PRODUCT_SLUGS.featuredBoost]: {
    summary: 'Put one listing at the top of search results and give it a highlighted card for 30 days.',
    included: [
      'Priority placement at the top of matching search results',
      'Highlighted, featured-styled listing card',
      'Eligible for the featured row on the homepage',
      'Runs for 30 days from activation',
    ],
    bestFor: 'A listing that is ready to sell or rent and needs more eyes this month.',
    billing: 'One-time charge. Does not renew.',
    finePrint: [
      '30-day duration · non-recurring — buy again to extend.',
      'Applies to one listing you select.',
      'Vendibook Pro members receive 1 boost credit per billing period.',
    ],
  },
  [ACTIVE_PRODUCT_SLUGS.conciergeListing]: {
    summary: 'Our team writes and structures a complete listing for you from the details you provide.',
    included: [
      'Written title, description and specification sheet',
      'Structured listing set up for search',
      'Photo and detail guidance before publishing',
    ],
    bestFor: 'Sellers who would rather hand the listing off than write it.',
    billing: 'One-time charge per listing.',
    finePrint: ['One-time service · non-recurring.', 'You review and approve before publishing.'],
  },
  [ACTIVE_PRODUCT_SLUGS.permitPathPlus]: {
    summary: 'The saving and tracking layer on top of PermitPath. Roadmap generation stays free.',
    included: [
      'Save permit roadmaps to your account',
      'Track permit status as you progress',
      'Store permit documents',
      'Export roadmaps to PDF',
    ],
    bestFor: 'Operators working through a real permit list across multiple agencies.',
    billing: 'Recurring monthly · cancel anytime.',
    finePrint: [
      'Included with Vendibook Pro at no extra cost.',
      'Cancel anytime — access continues through the current paid period.',
      'PermitPath Basic search and roadmap generation remain free.',
    ],
  },
};

/** Short benefit copy per active add-on. Falls back to the DB description. */
const ONE_LINERS: Record<string, string> = {
  [ACTIVE_PRODUCT_SLUGS.featuredBoost]: 'Top of search and a highlighted card for 30 days.',
  [ACTIVE_PRODUCT_SLUGS.conciergeListing]: 'Our team writes and structures your listing for you.',
  [ACTIVE_PRODUCT_SLUGS.permitPathPlus]: 'Save roadmaps, track permits, store documents, export PDFs.',
};

const STARTER_FEATURES = [
  'Unlimited listings for sale or for rent',
  'Payment protection and PayPal-secured checkout',
  'Free e-signatures on every agreement',
  'PermitPath Basic — unlimited permit roadmaps',
  'Pay-in-person sales are always free',
];

const PRO_FEATURES = [
  '10.9% seller/host fee instead of 12.9% — up to $500 saved per completed transaction',
  '1 Featured Boost credit every billing period',
  'PricePilot appraisals included — comparable-backed valuations for your equipment',
  'PermitPath Plus included — save and track permit roadmaps',
  'Priority placement in search and priority support',
];

/* ------------------------------------------------------------------ */
/* Add-on card — reuses the existing checkout helpers, light styling.  */
/* ------------------------------------------------------------------ */
function AddOnCard({
  product,
  includedLabel,
}: {
  product: MonetizationProduct;
  includedLabel?: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const { requestCheckout, dialog, pendingSlug } = useSubscriptionConsent();
  const recurring = product.billing_type === 'recurring';
  const activeBusy = busy || pendingSlug === product.slug;
  const price = effectivePriceCents(product);

  // Listing-scoped boosts must be attached to a listing, so send the member to
  // their listings instead of starting an orphaned charge.
  const requiresListing =
    product.promo_type === 'featured_7' ||
    product.promo_type === 'featured_30' ||
    product.promo_type === 'top_of_search';

  const handleClick = async () => {
    try {
      trackLeadEvent('checkout_started', { product_slug: product.slug, surface: 'pricing_addons' });
      const paths = buildCheckoutReturnPaths(product.slug);
      if (recurring) {
        await requestCheckout(product, { successPath: paths.successPath, cancelPath: paths.cancelPath });
        return;
      }
      setBusy(true);
      const { url } = await startMonetizationCheckout({
        productSlug: product.slug,
        successPath: paths.successPath,
        cancelPath: paths.cancelPath,
      });
      window.location.href = url;
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Could not start checkout');
    } finally {
      setBusy(false);
    }
  };

  const cadenceLabel = recurring
    ? '/mo'
    : product.duration_days
      ? ` · ${product.duration_days} days`
      : ' one-time';

  const details = ADDON_DETAILS[product.slug];

  const cta = () =>
    includedLabel ? (
      <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-border bg-accent px-4 py-3 text-sm font-semibold text-foreground">
        <Check className="h-4 w-4 text-primary" />
        {includedLabel}
      </span>
    ) : requiresListing ? (
      <Button asChild variant="cta-outline" size="cta" className="w-full">
        <Link to="/host/listings">
          Boost a listing <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    ) : (
      <Button
        variant="cta-outline"
        size="cta"
        className="w-full"
        disabled={activeBusy}
        onClick={handleClick}
      >
        {activeBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {recurring ? 'Review terms and continue' : 'Purchase'}
        {!activeBusy && <ArrowRight className="h-4 w-4" />}
      </Button>
    );

  return (
    <div className={`flex flex-col rounded-[24px] border border-border bg-card p-6 sm:p-7 ${CARD_SHADOW}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-base font-semibold text-foreground">{product.name}</h3>
        <span className="text-base font-semibold text-foreground">
          {formatUsd(price)}
          <span className="text-sm font-normal text-muted-foreground">{cadenceLabel}</span>
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {ONE_LINERS[product.slug] ?? product.description}
      </p>
      <div className="mt-6 flex-1" />
      {cta()}
      {details ? (
        <div className="mt-3 flex justify-center">
          <PlanDetailsDialog
            title={product.name}
            priceLabel={`${formatUsd(price)}${cadenceLabel}`}
            summary={details.summary}
            included={details.included}
            bestFor={details.bestFor}
            billing={details.billing}
            finePrint={details.finePrint}
            statusLabel={includedLabel}
          />
        </div>
      ) : null}
      {dialog}
    </div>
  );
}

/* ------------------------------------------------------------------ */

const Pricing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const reduce = useReducedMotion();

  const { tier, isLoading: tierLoading, currentPeriodEnd, cancelAtPeriodEnd } = useHostEntitlements();
  const permit = usePermitPathAccess();
  const { requestCheckout, dialog: consentDialog, pendingSlug } = useSubscriptionConsent();

  const { products: subs, loading: loadingSubs } = useMonetizationProducts('host_subscription');
  const { products: listingUpgrades, loading: l1 } = useMonetizationProducts('listing_upgrade');
  const { products: sellerServices, loading: l2 } = useMonetizationProducts('seller_service');
  const { products: permitUpgrades, loading: l3 } = useMonetizationProducts('permit_upgrade');

  const proProduct = useMemo(
    () => subs.find((p) => p.slug === ACTIVE_PRODUCT_SLUGS.vendibookPro),
    [subs],
  );

  const addOns = useMemo(() => {
    const seen = new Set<string>();
    // Hidden from the pricing page only (still honored for existing purchases
    // and still purchasable from their own surfaces):
    // - pro_listing / listing_rewrite: retired from this page per merchandising.
    // - pricepilot: presented here strictly as an included Pro tool, never with
    //   a standalone price.
    const hidden = new Set<string>([
      ACTIVE_PRODUCT_SLUGS.proListing,
      ACTIVE_PRODUCT_SLUGS.listingRewrite,
      ACTIVE_PRODUCT_SLUGS.pricePilot,
    ]);
    return [...listingUpgrades, ...sellerServices, ...permitUpgrades].filter((p) => {
      if (isRetiredProduct(p.slug) || hidden.has(p.slug) || seen.has(p.slug)) return false;
      seen.add(p.slug);
      return true;
    });
  }, [listingUpgrades, sellerServices, permitUpgrades]);

  const loadingAddOns = l1 || l2 || l3;
  const isPro = tier === 'pro' || tier === 'premium';
  const proPrice = proProduct ? effectivePriceCents(proProduct) : 7900;
  const proBusy = !!proProduct && pendingSlug === proProduct.slug;

  const renews = (() => {
    if (!currentPeriodEnd) return null;
    try {
      return new Date(currentPeriodEnd).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      });
    } catch { return null; }
  })();

  const startPro = () => {
    if (!proProduct || proBusy) return;
    if (!user) {
      navigate(
        buildPlanAuthReturnTo({
          planSlug: proProduct.slug,
          interval: 'monthly',
          pathname: location.pathname,
          search: location.search,
        }),
      );
      return;
    }
    const paths = buildCheckoutReturnPaths(proProduct.slug);
    const successPath = returnTo
      ? `${returnTo}${returnTo.includes('?') ? '&' : '?'}purchase=success`
      : paths.successPath;
    void requestCheckout(proProduct, {
      interval: 'monthly',
      successPath,
      cancelPath: returnTo ?? paths.cancelPath,
    });
  };

  const permitIncluded = isPro
    ? 'Included with Vendibook Pro'
    : permit.isPlus
      ? permit.reason === 'grandfathered'
        ? 'Included — founding member'
        : 'Active on your account'
      : null;

  const proCta = isPro ? (
    <Button asChild variant="cta-outline" size="cta" className="w-full">
      <Link to="/dashboard?view=host&tab=membership">Manage membership</Link>
    </Button>
  ) : (
    <Button
      variant="cta"
      size="cta"
      className="w-full"
      onClick={startPro}
      disabled={loadingSubs || !proProduct || proBusy}
    >
      {proBusy ? (
        <><Loader2 className="h-4 w-4 animate-spin" /> Opening PayPal…</>
      ) : (
        <>Go Pro <ArrowRight className="h-4 w-4" /></>
      )}
    </Button>
  );

  return (
    <div className="sale-light min-h-screen flex flex-col">
      <SEO
        title="Vendibook Pricing — Free & Vendibook Pro Membership"
        description="Start free on Vendibook or go Pro for a lower 10.9% seller fee, a monthly Featured Boost credit and premium tools. Cancel anytime."
        canonical="/pricing"
        image="https://vendibook.com/images/social/vendibook-og-pricing.jpg"
        imageAlt="Vendibook plans and pricing"
      />

      <Header />

      <main className="flex-1">
        {/* ---------------------------------------------------------- */}
        {/* HERO                                                        */}
        {/* ---------------------------------------------------------- */}
        <section className="relative overflow-hidden pt-12 pb-12 md:pt-20 md:pb-16">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(900px 480px at 50% -10%, rgba(255,106,26,0.09), transparent 65%)',
            }}
            aria-hidden="true"
          />
          <div className="container max-w-3xl mx-auto px-4 relative z-10 text-center">
            <motion.div
              initial={reduce ? undefined : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card border border-border text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground mb-6 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
                Pricing
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-[3.4rem] font-bold tracking-tight text-foreground mb-5 leading-[1.06]">
                Sell more. Keep more when you close.
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Start free and pay only when you earn. Upgrade to Pro when you&rsquo;re
                ready for a lower fee, more visibility, and the full tool set.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* PLANS — Starter vs Vendibook Pro                            */}
        {/* ---------------------------------------------------------- */}
        <section aria-labelledby="membership" className="pb-16 md:pb-24">
          <h2 id="membership" className="sr-only">Membership plans</h2>
          <div className="container max-w-5xl mx-auto px-4">
            <div className="grid gap-6 md:grid-cols-2 md:items-stretch">

              {/* Starter */}
              <motion.div
                {...(reduce ? {} : fadeUp)}
                className={`flex flex-col rounded-[28px] border border-border bg-card p-8 md:p-10 ${CARD_SHADOW}`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-xl font-bold text-foreground">Starter</h3>
                  {!tierLoading && !isPro && (
                    <span className="rounded-full border border-border bg-accent px-3 py-1 text-[11px] font-semibold text-foreground">
                      Your plan
                    </span>
                  )}
                </div>
                <p className="mt-5 text-4xl font-bold tracking-tight text-foreground">
                  $0<span className="ml-1.5 text-base font-normal text-muted-foreground">/month</span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">12.9%</span> seller/host
                  fee on completed transactions. No listing fees, no contract.
                </p>

                <ul className="mt-8 space-y-3.5">
                  {STARTER_FEATURES.map((f) => (
                    <li key={f} className="flex gap-3 text-[15px] leading-relaxed text-muted-foreground">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-foreground/40" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-10 flex-1" />
                <Button asChild variant="cta-outline" size="cta" className="w-full">
                  <Link to="/list/start">Create a listing</Link>
                </Button>
                <div className="mt-3 flex justify-center">
                  <PlanDetailsDialog
                    title="Starter"
                    priceLabel="$0/month"
                    summary="Everything you need to list, get paid and close a deal on Vendibook. No listing fees and no contract."
                    included={[
                      'Unlimited listings for sale or for rent',
                      '12.9% seller/host fee on completed transactions',
                      ...STARTER_FEATURES.slice(1),
                    ]}
                    bestFor="Anyone listing their first truck, trailer, cart or space."
                    billing="No charge. You only pay a 12.9% seller/host fee when a transaction completes."
                    finePrint={[
                      'Pay-in-person sales are free — no commission and no buyer fee.',
                      'Rentals paid in person still owe the host commission.',
                    ]}
                  />
                </div>
              </motion.div>

              {/* Vendibook Pro */}
              <motion.div
                {...(reduce ? {} : fadeUp)}
                transition={{ duration: 0.5, delay: reduce ? 0 : 0.08, ease }}
                className={`relative flex flex-col rounded-[28px] border border-primary/35 bg-card p-8 md:p-10 ${CARD_SHADOW}`}
              >
                <span className="absolute -top-3 left-8 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                  Most popular
                </span>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-xl font-bold text-foreground">Vendibook Pro</h3>
                  {!tierLoading && isPro && (
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                      Your plan
                    </span>
                  )}
                </div>
                <p className="mt-5 text-4xl font-bold tracking-tight text-foreground">
                  {loadingSubs ? '—' : formatUsd(proPrice)}
                  <span className="ml-1.5 text-base font-normal text-muted-foreground">/month</span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  <span className="font-semibold text-primary">10.9%</span> seller/host fee
                  — our lowest rate. Cancel anytime.
                </p>

                {isPro && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {cancelAtPeriodEnd
                      ? `Your membership stays active until ${renews ?? 'the end of the period'}.`
                      : renews
                        ? `Active — renews ${renews}.`
                        : 'Your membership is active.'}
                  </p>
                )}

                <ul className="mt-8 space-y-3.5">
                  {PRO_FEATURES.map((f) => (
                    <li key={f} className="flex gap-3 text-[15px] leading-relaxed text-foreground">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-10 flex-1" />
                {proCta}
                <div className="mt-3 flex justify-center">
                  <PlanDetailsDialog
                    title="Vendibook Pro"
                    priceLabel={`${loadingSubs ? '—' : formatUsd(proPrice)}/month`}
                    summary="A lower seller/host fee, a Featured Boost credit every billing period and the premium tool set — on one monthly membership."
                    included={PRO_FEATURES}
                    bestFor="Sellers and hosts closing regularly, where the fee difference outweighs the membership."
                    billing="Recurring monthly through PayPal · cancel anytime."
                    statusLabel={isPro ? 'Your plan' : null}
                    finePrint={[
                      'The 10.9% rate applies to the seller/host side of a completed transaction, up to $500 saved per transaction.',
                      'The Featured Boost credit is 1 per billing period and does not roll over.',
                      'Cancel anytime — access continues through the end of the current paid period.',
                    ]}
                  />
                </div>
              </motion.div>
            </div>

            {/* PricePilot — presented strictly as an included Pro tool. */}
            <motion.div {...(reduce ? {} : fadeUp)}>
              <Link
                to="/tools/pricepilot"
                className={`group mt-6 flex flex-col gap-4 rounded-[24px] border border-border bg-card p-6 transition-colors hover:border-primary/35 sm:flex-row sm:items-center sm:justify-between ${CARD_SHADOW}`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-base font-semibold text-foreground">PricePilot</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                      <Check className="h-3 w-3" />
                      Included with Vendibook Pro
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    A data-backed appraisal of what your equipment is worth — a comparable-backed
                    range, a recommended price, and rental benchmarks. Included with Pro at no
                    extra cost.
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary">
                  Explore PricePilot
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </Link>
            </motion.div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Payment protection at checkout</span>
              <span className="inline-flex items-center gap-1.5"><Lock className="h-4 w-4" /> PayPal-secured billing</span>
              <span className="inline-flex items-center gap-1.5"><XCircle className="h-4 w-4" /> Cancel anytime online</span>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* ADD-ONS                                                     */}
        {/* ---------------------------------------------------------- */}
        <section id="upgrades" aria-labelledby="upgrades-title" className="py-14 md:py-20 border-t border-border bg-card/50">
          <div className="container max-w-5xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="mb-10 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary mb-2">
                Optional extras
              </p>
              <h2 id="upgrades-title" className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
                Upgrades &amp; services, when you need them.
              </h2>
              <p className="text-base text-muted-foreground mt-3 leading-relaxed">
                One-time tools and services that work on any plan. No subscription required.
              </p>
            </motion.div>

            {loadingAddOns ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <motion.div {...(reduce ? {} : fadeUp)} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {addOns.map((p) => (
                  <AddOnCard
                    key={p.id}
                    product={p}
                    includedLabel={
                      p.slug === ACTIVE_PRODUCT_SLUGS.permitPathPlus ? permitIncluded : null
                    }
                  />
                ))}
              </motion.div>
            )}

            <p className="mt-8 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Memberships are billed securely through PayPal. Cancel any time — access
              continues through the current paid period. Existing subscribers keep their
              current pricing.
            </p>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* FAQ                                                         */}
        {/* ---------------------------------------------------------- */}
        <section className="py-14 md:py-20 border-t border-border">
          <div className="container max-w-3xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)}>
              <PlansFAQ />
            </motion.div>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* FINAL CTA                                                   */}
        {/* ---------------------------------------------------------- */}
        <section className="py-16 md:py-24 border-t border-border">
          <div className="container max-w-4xl mx-auto px-4">
            <motion.div
              {...(reduce ? {} : fadeUp)}
              className="relative overflow-hidden rounded-[32px] border border-border bg-card px-6 py-14 sm:px-12 md:py-16 text-center shadow-[0_28px_64px_-32px_rgba(24,20,16,0.35)]"
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(600px 300px at 50% 0%, rgba(255,106,26,0.10), transparent 70%)',
                }}
                aria-hidden="true"
              />
              <div className="relative">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4 leading-tight">
                  List it once. Sell it with the whole platform behind you.
                </h2>
                <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
                  Start free today — upgrade to Pro whenever the math makes sense for
                  your business.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Button variant="cta" size="cta" className="w-full sm:w-auto" asChild>
                    <Link to="/list/start">
                      Create a listing <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  {!isPro && (
                    <Button
                      variant="cta-outline"
                      size="cta"
                      className="w-full sm:w-auto"
                      onClick={startPro}
                      disabled={loadingSubs || !proProduct || proBusy}
                    >
                      {proBusy ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Opening PayPal…</>
                      ) : (
                        <>Go Pro</>
                      )}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-7">
                  Questions first? Visit the{' '}
                  <Link to="/help" className="underline underline-offset-2 hover:text-foreground">
                    Help Center
                  </Link>
                  .
                </p>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />

      {consentDialog}
    </div>
  );
};

export default Pricing;
