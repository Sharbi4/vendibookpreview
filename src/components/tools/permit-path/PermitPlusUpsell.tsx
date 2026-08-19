/**
 * Shared PermitPath Plus upsell.
 *
 * One component drives both places a Basic user hits the Plus line: the
 * dashboard Permits gate and the "Save to dashboard" action on the tool page.
 * Price and cadence come from the monetization catalog, never hard-coded.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, FileCheck, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useMonetizationProducts } from '@/hooks/useMonetizationProducts';
import { useSubscriptionConsent } from '@/hooks/useSubscriptionConsent';
import { useCatalogPrice } from '@/hooks/useCatalogPrices';
import { buildCheckoutReturnPaths } from '@/lib/monetization/returnRoutes';
import {
  PERMIT_BASIC_FEATURES,
  PERMIT_PLUS_FEATURES,
  PERMIT_PLUS_SLUG,
} from '@/lib/permits/permitPathAccess';

/** Live "$7.99/mo" label from the catalog. */
export function usePermitPlusPriceLabel(): string {
  const price = useCatalogPrice(PERMIT_PLUS_SLUG);
  return price.labelWithCadence;
}

/** Checkout starter for PermitPath Plus, with the recurring-consent dialog. */
export function usePermitPlusCheckout(surfaceReturnPath?: string) {
  const { products } = useMonetizationProducts('permit_upgrade');
  const { requestCheckout, dialog } = useSubscriptionConsent();
  const [busy, setBusy] = useState(false);

  const product = products.find((p) => p.slug === PERMIT_PLUS_SLUG) ?? null;

  const startCheckout = async () => {
    if (!product) return;
    setBusy(true);
    try {
      const paths = buildCheckoutReturnPaths(product.slug);
      await requestCheckout(product, {
        successPath: surfaceReturnPath ?? paths.successPath,
        cancelPath: paths.cancelPath,
      });
    } finally {
      setBusy(false);
    }
  };

  return { product, startCheckout, busy, consentDialog: dialog };
}

interface PanelProps {
  /** Heading tuned to the surface the user is on. */
  title?: string;
  subtitle?: string;
  className?: string;
  /** Where PayPal should return the member after a successful subscription. */
  returnPath?: string;
}

/** Basic vs Plus comparison + subscribe CTA. */
export function PermitPlusPanel({ title, subtitle, className, returnPath }: PanelProps) {
  const priceLabel = usePermitPlusPriceLabel();
  const { product, startCheckout, busy, consentDialog } = usePermitPlusCheckout(returnPath);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b from-white/[0.05] via-[#141418] to-[#101013] p-6 md:p-8 shadow-[0_8px_28px_-14px_rgba(0,0,0,0.7)] ${className ?? ''}`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
      <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-white/70">
        <Lock className="h-3 w-3" /> Plus
      </div>

      <div className="max-w-2xl">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-10 w-10 rounded-xl bg-[hsl(var(--brand-ember)/0.12)] border border-[hsl(var(--brand-ember)/0.35)] flex items-center justify-center">
            <FileCheck className="h-5 w-5 text-[hsl(var(--brand-ember))]" />
          </div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--brand-ember))] font-semibold">
            PermitPath Plus · {priceLabel}
          </div>
        </div>

        <h3 className="text-xl md:text-2xl font-semibold text-white leading-tight">
          {title ?? 'Save your permits, track every step, never miss a renewal.'}
        </h3>
        <p className="text-sm text-white/65 mt-2 leading-relaxed">
          {subtitle ??
            'PermitPath Basic stays free — run it as often as you like. Plus adds the saved, tracked layer on top.'}
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/45 font-semibold mb-2">
              Basic · Free
            </div>
            <ul className="space-y-2 text-sm text-white/65">
              {PERMIT_BASIC_FEATURES.map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/40" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--brand-ember))] font-semibold mb-2">
              Plus · {priceLabel}
            </div>
            <ul className="space-y-2 text-sm text-white/80">
              {PERMIT_PLUS_FEATURES.map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[hsl(var(--brand-ember))] shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="cta"
            className="h-9"
            onClick={() => { void startCheckout(); }}
            disabled={!product || busy}
          >
            {busy ? 'Starting…' : `Get PermitPath Plus — ${priceLabel}`}
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-9 text-xs border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-white/85"
          >
            <Link to="/tools/permitpath">Use the free checklist</Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="h-9 text-xs text-white/60 hover:text-white hover:bg-white/[0.06]"
          >
            <Link to="/pricing">Compare plans</Link>
          </Button>
        </div>

        <p className="mt-3 text-[11px] text-white/40">
          Included with Vendibook Pro. Cancel anytime — access continues through the paid period.
        </p>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, hsl(var(--brand-ember) / 0.14), transparent 65%)' }}
      />
      {consentDialog}
    </div>
  );
}

/** Modal wrapper used when a Basic user taps a Plus-only action. */
export function PermitPlusUpsellDialog({
  open,
  onOpenChange,
  returnPath,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  returnPath?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-white/12 bg-[#0d0d10] p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>PermitPath Plus</DialogTitle>
          <DialogDescription>
            Saving and tracking permit roadmaps requires PermitPath Plus.
          </DialogDescription>
        </DialogHeader>
        <PermitPlusPanel
          className="border-0 shadow-none"
          title="Saving a roadmap is a Plus feature"
          subtitle="Your results stay on screen for free. Plus keeps them in your dashboard with status, documents and renewal reminders."
          returnPath={returnPath}
        />
      </DialogContent>
    </Dialog>
  );
}

export default PermitPlusPanel;
