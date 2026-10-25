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
import MembershipPlans from '@/components/pricing/MembershipPlans';
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
import BuyerMatchBenefits from '@/components/monetization/BuyerMatchBenefits';
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
  [ACTIVE_PRODUCT_SLUGS.permitPathPlus]: 'Save roadmaps, track permits, store documents, export PDFs.',
};

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
        <Link to="/dashboard/listings">
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
  const [annual, setAnnual] = useState(searchParams.get('interval') === 'annual');
  const reduce = useReducedMotion();

  const { tier, isLoading: tierLoading, currentPeriodEnd, cancelAtPeriodEnd } = useHostEntitlements();
  const permit = usePermitPathAccess();
  const { requestCheckout, dialog: consentDialog, pendingSlug } = useSubscriptionConsent();

  const { products: subs, loading: loadingSubs } = useMonetizationProducts('host_subscription');
  const { products: listingUpgrades, loading: l1 } = useMonetizationProducts('listing_upgrade');
  const { products: sellerServices, loading: l2 } = useMonetizationProducts('seller_service');
  const { products: permitUpgrades, loading: l3 } = useMonetizationProducts('permit_upgrade');

  const proProduct = useMemo(
    () => subs.find((p) => p.is_active && p.slug === (annual ? 'vendibook_pro_annual' : ACTIVE_PRODUCT_SLUGS.vendibookPro)),
    [subs, annual],
  );

  const featuredProduct = listingUpgrades.find(p => p.slug === 'featured_listing_monthly' && p.is_active);
  const addOns = useMemo(() => {
    const seen = new Set<string>();
    // Hidden from the pricing page only (still honored for existing purchases
    // and still purchasable from their own surfaces):
    // - pro_listing / listing_rewrite: retired from this page per merchandising.
    // - pricepilot: presented here strictly as an included Pro tool, never with
    //   a standalone price.
    const hidden = new Set<string>([
      'featured_listing_monthly',
      ACTIVE_PRODUCT_SLUGS.featuredBoost,
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
          interval: annual ? 'annual' : 'monthly',
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
      interval: annual ? 'annual' : 'monthly',
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
    <Button asChild variant="cta-outline" size="cta" className="w-full border-white/30 bg-white text-[#181410] hover:bg-white/90">
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
        <><Loader2 className="h-4 w-4 animate-spin" /> Opening checkout…</>
      ) : (
        <>Go Pro <ArrowRight className="h-4 w-4" /></>
      )}
    </Button>
  );

  return (
    <div className="sale-light min-h-screen flex flex-col">
      <SEO
        title="Vendibook Pricing — Free & Vendibook Pro Membership"
        description="Vendibook Pro adds BuyerMatch AI, priority buyer and renter discovery, reviewed outreach reports, a Featured Boost credit per billing period and premium tools."
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
                More possibilities. One clear plan.
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Publish for free. Choose Pro when you&rsquo;re
                ready for buyer and renter discovery, reviewed outreach activity, and the full tool set.
              </p>
              <div className="mt-8 inline-flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Free listing tools</span>
                <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Transparent transaction fees</span>
                <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Cancel Pro anytime</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* PLANS — Starter vs Vendibook Pro                            */}
        {/* ---------------------------------------------------------- */}
        <MembershipPlans
          annual={annual} onAnnualChange={setAnnual}
          proPrice={loadingSubs ? '—' : proProduct ? formatUsd(proPrice) : 'Unavailable'}
          featuredPrice={l1 ? '—' : featuredProduct ? formatUsd(effectivePriceCents(featuredProduct)) : 'Unavailable'}
          proAction={proCta} isPro={isPro}
          membershipStatus={isPro ? (cancelAtPeriodEnd ? `Active until ${renews ?? 'the end of your paid period'}.` : renews ? `Renews ${renews}.` : 'Your membership is active.') : null}
        />
        <section id="buyermatch-overview" className="container mx-auto max-w-5xl px-4 pb-12 scroll-mt-24"><BuyerMatchBenefits /></section>
        <section className="pb-16 md:pb-24"><div className="container max-w-5xl mx-auto px-4">
            {/* How fees work — who pays what, stated once. */}
            <motion.div {...(reduce ? {} : fadeUp)} className={`mt-14 overflow-hidden rounded-[24px] border border-border bg-card ${CARD_SHADOW}`}>
              <div className="border-b border-border px-6 py-5 sm:px-8">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">How fees work</p>
                <p className="mt-1 text-sm text-muted-foreground">Fees apply only when a sale or booking completes through Vendibook.</p>
              </div>
              <dl className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {[
                  { who: 'Equipment sellers', rate: '8.7%', note: 'New online sales, on Free and Pro. Equipment price only; excludes tax and separately priced transport.' },
                  { who: 'Rental hosts', rate: '12.9%', note: 'Same commission on Free and Pro.' },
                  { who: 'Renters', rate: '12.9%', note: 'Service fee shown at checkout before you pay.' },
                  { who: 'Buyers', rate: '$0', note: 'No Vendibook fee on purchases.' },
                ].map((row) => (
                  <div key={row.who} className="px-6 py-6 sm:px-8">
                    <dt className="text-sm font-semibold text-foreground">{row.who}</dt>
                    <dd className="mt-2 text-3xl font-bold tracking-tight text-foreground">{row.rate}</dd>
                    <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{row.note}</dd>
                  </div>
                ))}
              </dl>
            </motion.div>

            {/* Dealers and enterprise — custom terms through the team. */}
            <motion.div
              {...(reduce ? {} : fadeUp)}
              className={`mt-6 flex flex-col gap-4 rounded-[24px] border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8 ${CARD_SHADOW}`}
            >
              <div>
                <p className="text-base font-semibold text-foreground">Dealers and enterprise</p>
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  Listing a fleet or dealer inventory? Talk to our team about bulk onboarding and custom terms.
                </p>
              </div>
              <Button asChild variant="cta-outline" size="cta" className="shrink-0">
                <Link to="/contact">Contact sales <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </motion.div>
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
                Optional tools and services, with billing terms shown before purchase.
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
              Memberships use secure checkout. Cancel any time — access
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
                        <><Loader2 className="h-4 w-4 animate-spin" /> Opening checkout…</>
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
