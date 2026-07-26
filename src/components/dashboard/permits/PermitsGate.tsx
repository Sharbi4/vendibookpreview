import { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileCheck, Flame, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PremiumChip } from '@/components/monetization/PremiumChip';
import { ProductLearnMoreOverlay } from '@/components/monetization/ProductLearnMoreOverlay';
import { useToolAccess } from '@/hooks/useToolAccess';
import { useMonetizationProducts } from '@/hooks/useMonetizationProducts';
import { useSubscriptionConsent } from '@/hooks/useSubscriptionConsent';
import { buildCheckoutReturnPaths } from '@/lib/monetization/returnRoutes';

/**
 * Gates the Permits tab body. Unlocks for:
 *   - PermitPath Plus one-time purchase
 *   - Any host subscription (Starter+/Growth/Operator)
 *   - Legacy PermitPath users (grandfathered founding member)
 *
 * Everyone can still use the free basic PermitPath tool at /tools/permitpath
 * — the gate only covers the "save + track + remind" layer.
 */
export function PermitsGate({ children }: { children: ReactNode }) {
  const access = useToolAccess();
  const gate = access.bySlug['permitpath'];
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Fetch upgrade products for the overlay CTA.
  const { products: upgradeProducts } = useMonetizationProducts('permit_upgrade');
  const { products: subProducts } = useMonetizationProducts('host_subscription');
  const { requestCheckout } = useSubscriptionConsent();

  const plusProduct =
    upgradeProducts.find((p) => p.slug === 'permit_path_plus') ??
    subProducts.find((p) => p.slug === 'host_growth') ??
    null;

  if (access.isLoading) {
    return <div className="h-40" aria-hidden />;
  }

  if (gate?.unlocked) {
    return <>{children}</>;
  }

  const handleBuy = async () => {
    if (!plusProduct) return;
    setBusy(true);
    try {
      const paths = buildCheckoutReturnPaths(plusProduct.slug);
      await requestCheckout(plusProduct, {
        successPath: paths.successPath,
        cancelPath: paths.cancelPath,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/55 font-semibold mb-1">
          Permits &amp; Licenses
        </div>
        <h2 className="text-2xl font-bold text-white leading-tight">Your permit tracker</h2>
        <p className="text-sm text-white/60 mt-1">
          Save your roadmaps, track progress, and get renewal reminders.
        </p>
      </div>

      {/* Locked panel */}
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b from-white/[0.05] via-[#141418] to-[#101013] p-6 md:p-8 shadow-[0_8px_28px_-14px_rgba(0,0,0,0.7)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
        <div className="absolute right-4 top-4 flex items-center gap-1.5">
          <PremiumChip label="PRO" />
          <span className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-white/70">
            <Lock className="h-3 w-3" /> Plus
          </span>
        </div>

        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-10 w-10 rounded-xl bg-[hsl(var(--brand-ember)/0.12)] border border-[hsl(var(--brand-ember)/0.35)] flex items-center justify-center">
              <FileCheck className="h-5 w-5 text-[hsl(var(--brand-ember))]" />
            </div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--brand-ember))] font-semibold">
              PermitPath Plus
            </div>
          </div>
          <h3 className="text-xl md:text-2xl font-semibold text-white leading-tight">
            Save your permits, track every step, never miss a renewal.
          </h3>
          <p className="text-sm text-white/65 mt-2 leading-relaxed">
            The basic PermitPath checklist is free — you can run it any time.
            Save-and-track adds status per permit (Not started · In progress ·
            Submitted · Approved), permit numbers, uploaded docs, cost totals,
            and 30/60-day renewal reminders in one place.
          </p>

          <ul className="mt-4 space-y-2 text-sm text-white/75">
            {[
              'Save unlimited roadmaps across cities and business types',
              'Progress bar and cost total per roadmap',
              'Renewal reminders 60 / 30 / 7 days out',
              'PDF export for lenders, landlords and health inspectors',
              'Included free with Growth and Operator — or unlock standalone with Plus',
            ].map((line) => (
              <li key={line} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[hsl(var(--brand-ember))] shrink-0" />
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="bg-[#FF5124] hover:bg-[#FF5124]/90 text-white h-9 font-semibold"
              onClick={() => setOverlayOpen(true)}
              disabled={!plusProduct}
            >
              <Flame className="h-4 w-4 mr-1.5" />
              See what's inside
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-9 text-xs border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-white/85"
            >
              <Link to="/tools/permitpath">
                Use free checklist
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="h-9 text-xs text-white/60 hover:text-white hover:bg-white/[0.06]"
            >
              <Link to="/pricing">
                Compare plans
              </Link>
            </Button>
          </div>

          <p className="mt-3 text-[11px] text-white/40">
            Founding members get Plus free — sign in with your founding-member
            account and your saved roadmaps unlock automatically.
          </p>
        </div>

        {/* subtle ember decoration */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, hsl(var(--brand-ember) / 0.14), transparent 65%)' }}
        />
      </div>

      {plusProduct && (
        <ProductLearnMoreOverlay
          open={overlayOpen}
          onOpenChange={setOverlayOpen}
          product={plusProduct}
          surface="dashboard:permits_tab_gate"
          ctaLabel="Unlock PermitPath Plus"
          ctaBusy={busy}
          onBuy={handleBuy}
        />
      )}
    </div>
  );
}

export default PermitsGate;
