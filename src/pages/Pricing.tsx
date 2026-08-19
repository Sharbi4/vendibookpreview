/**
 * /pricing (also served at /plans) — the single pricing source of truth.
 *
 * Presentation only. Prices come from the monetization catalog
 * (`monetization_products`, the same rows PayPal is charged against) and every
 * purchase goes through the existing checkout helpers — no billing, PayPal or
 * entitlement logic is defined here.
 *
 * Styling follows the redesigned for-sale pages via the `.sale-light` scope:
 * warm off-white canvas, white cards, charcoal type, soft gray hairlines,
 * rounded corners and restrained Vendibook orange.
 */
import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight, Check, Crown, Loader2, Lock, Percent, ShieldCheck, XCircle, Zap,
} from 'lucide-react';
import SEO from '@/components/SEO';
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

/** Short benefit copy per active add-on. Falls back to the DB description. */
const ONE_LINERS: Record<string, string> = {
  [ACTIVE_PRODUCT_SLUGS.featuredBoost]: 'Top of search and a highlighted card for 30 days.',
  [ACTIVE_PRODUCT_SLUGS.proListing]: 'Premium listing presentation and priority placement for 30 days.',
  [ACTIVE_PRODUCT_SLUGS.conciergeListing]: 'Our team writes and structures your listing for you.',
  [ACTIVE_PRODUCT_SLUGS.permitPathPlus]: 'Save roadmaps, track permits, store documents, export PDFs.',
  [ACTIVE_PRODUCT_SLUGS.listingRewrite]: 'A rewritten title, description and spec sheet for your listing.',
};

const FREE_FEATURES = [
  'List for sale or for rent — unlimited browsing',
  '12.9% seller/host fee on completed transactions',
  'Payment protection and PayPal-secured checkout',
  'Free e-signatures on every agreement',
  'PermitPath Basic — unlimited permit roadmaps',
];

const PRO_FEATURES = [
  { icon: Percent, text: '10.9% seller/host fee instead of 12.9% — up to $500 saved per transaction' },
  { icon: Zap, text: '1 Featured Boost credit every billing period' },
  { icon: Crown, text: 'Premium tools and analytics, including PermitPath Plus' },
  { icon: ShieldCheck, text: 'Priority placement in search and priority support' },
];

const Card = ({
  children,
  className = '',
}: { children: React.ReactNode; className?: string }) => (
  <div
    className={`rounded-3xl border border-[rgba(24,20,16,0.09)] bg-white p-6 sm:p-8 shadow-[0_1px_2px_rgba(24,20,16,0.04),0_16px_40px_-28px_rgba(24,20,16,0.4)] ${className}`}
  >
    {children}
  </div>
);

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

  return (
    <div className="flex flex-col rounded-2xl border border-[rgba(24,20,16,0.09)] bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-[15px] font-semibold text-foreground">{product.name}</h3>
        <span className="text-[13px] font-medium text-foreground">
          {formatUsd(price)}
          <span className="text-muted-foreground">
            {recurring ? '/mo' : product.duration_days ? ` · ${product.duration_days} days` : ' one-time'}
          </span>
        </span>
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
        {ONE_LINERS[product.slug] ?? product.description}
      </p>
      <div className="mt-4 flex-1" />
      {includedLabel ? (
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[rgba(24,20,16,0.1)] bg-[rgba(24,20,16,0.03)] px-3 py-1.5 text-[12px] font-medium text-foreground">
          <Check className="h-3.5 w-3.5 text-[hsl(var(--brand-ember))]" />
          {includedLabel}
        </span>
      ) : requiresListing ? (
        <Button asChild variant="cta-outline" size="sm" className="w-fit gap-1">
          <Link to="/host/listings">
            Boost a listing <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      ) : (
        <Button
          variant="cta-outline"
          size="sm"
          className="w-fit gap-1"
          disabled={activeBusy}
          onClick={handleClick}
        >
          {activeBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {recurring ? 'Review terms and continue' : 'Purchase'}
          {!activeBusy && <ArrowRight className="h-3.5 w-3.5" />}
        </Button>
      )}
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
    return [...listingUpgrades, ...sellerServices, ...permitUpgrades].filter((p) => {
      if (isRetiredProduct(p.slug) || seen.has(p.slug)) return false;
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

  return (
    <div className="sale-light min-h-screen">
      <SEO
        title="Vendibook Pricing — Free & Vendibook Pro Membership"
        description="Start free on Vendibook or go Pro for a lower 10.9% seller fee, a monthly Featured Boost credit and premium tools. Cancel anytime."
      />

      <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
        {/* Intro */}
        <header className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Pricing
          </p>
          <h1 className="mt-2 text-[30px] md:text-[38px] font-semibold tracking-tight text-foreground leading-[1.1]">
            Start free. Go Pro when the math is obvious.
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            One account covers selling and hosting. No listing fees, no contracts — you only pay a
            commission when a transaction completes.
          </p>
        </header>

        {/* Membership */}
        <section aria-labelledby="membership" className="mt-10">
          <h2 id="membership" className="sr-only">Membership</h2>
          <div className="grid gap-5 md:grid-cols-2 md:items-start">
            {/* Free */}
            <Card>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[18px] font-semibold text-foreground">Free</h3>
                {!tierLoading && !isPro && (
                  <span className="rounded-full border border-[rgba(24,20,16,0.1)] bg-[rgba(24,20,16,0.03)] px-2.5 py-1 text-[11px] font-medium text-foreground">
                    Your plan
                  </span>
                )}
              </div>
              <p className="mt-3 text-[32px] font-semibold tracking-tight text-foreground">
                $0<span className="ml-1 text-[14px] font-normal text-muted-foreground">/month</span>
              </p>
              <ul className="mt-5 space-y-2.5">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex gap-2.5 text-[13.5px] leading-relaxed text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground/40" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant="cta-outline" className="mt-6 w-full">
                <Link to="/list/start">Create a listing</Link>
              </Button>
            </Card>

            {/* Vendibook Pro */}
            <Card className="ring-1 ring-[hsl(var(--brand-ember)/0.25)]">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h3 className="flex items-center gap-2 text-[18px] font-semibold text-foreground">
                  <Crown className="h-4.5 w-4.5 text-[hsl(var(--brand-ember))]" />
                  Vendibook Pro
                </h3>
                {!tierLoading && isPro && (
                  <span className="rounded-full border border-[hsl(var(--brand-ember)/0.3)] bg-[hsl(var(--brand-ember)/0.08)] px-2.5 py-1 text-[11px] font-medium text-foreground">
                    Your plan
                  </span>
                )}
              </div>
              <p className="mt-3 text-[32px] font-semibold tracking-tight text-foreground">
                {loadingSubs ? '—' : formatUsd(proPrice)}
                <span className="ml-1 text-[14px] font-normal text-muted-foreground">/month</span>
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">Cancel anytime.</p>

              <ul className="mt-5 space-y-2.5">
                {PRO_FEATURES.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex gap-2.5 text-[13.5px] leading-relaxed text-foreground/85">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--brand-ember))]" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>

              {isPro ? (
                <div className="mt-6">
                  <p className="text-[13px] text-muted-foreground">
                    {cancelAtPeriodEnd
                      ? `Your membership stays active until ${renews ?? 'the end of the period'}.`
                      : renews
                        ? `Active — renews ${renews}.`
                        : 'Your membership is active.'}
                  </p>
                  <Button asChild variant="cta-outline" className="mt-3 w-full">
                    <Link to="/dashboard?view=host&tab=membership">Manage membership</Link>
                  </Button>
                </div>
              ) : (
                <Button
                  variant="cta"
                  className="mt-6 w-full"
                  onClick={startPro}
                  disabled={loadingSubs || !proProduct || proBusy}
                >
                  {proBusy ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Opening PayPal…</>
                  ) : (
                    <>Go Pro <ArrowRight className="ml-1.5 h-4 w-4" /></>
                  )}
                </Button>
              )}
            </Card>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Payment protection at checkout</span>
            <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> PayPal-secured billing</span>
            <span className="inline-flex items-center gap-1.5"><XCircle className="h-3.5 w-3.5" /> Cancel anytime online</span>
          </div>
        </section>

        {/* Add-ons */}
        <section id="upgrades" aria-labelledby="upgrades-title" className="mt-14">
          <h2 id="upgrades-title" className="text-[22px] font-semibold tracking-tight text-foreground">
            Upgrades &amp; services
          </h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
            One-time tools and add-ons. No subscription required.
          </p>

          {loadingAddOns ? (
            <div className="mt-8 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {addOns.map((p) => (
                <AddOnCard
                  key={p.id}
                  product={p}
                  includedLabel={
                    p.slug === ACTIVE_PRODUCT_SLUGS.permitPathPlus ? permitIncluded : null
                  }
                />
              ))}
            </div>
          )}

          <p className="mt-6 rounded-2xl border border-[rgba(24,20,16,0.09)] bg-white p-4 text-[12.5px] leading-relaxed text-muted-foreground">
            Memberships are billed securely through PayPal. Cancel any time — access continues through
            the current paid period. Existing subscribers keep their current pricing.
          </p>
        </section>

        {/* FAQ */}
        <section className="mt-14">
          <PlansFAQ />
        </section>
      </div>

      {consentDialog}
    </div>
  );
};

export default Pricing;
