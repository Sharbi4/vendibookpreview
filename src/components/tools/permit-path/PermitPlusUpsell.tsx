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

/** Basic vs Plus comparison + subscribe CTA — light, premium Vendibook style. */
export function PermitPlusPanel({ title, subtitle, className, returnPath }: PanelProps) {
  const priceLabel = usePermitPlusPriceLabel();
  const { product, startCheckout, busy, consentDialog } = usePermitPlusCheckout(returnPath);

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-stone-200 bg-white p-6 md:p-8 shadow-[0_10px_40px_-24px_rgba(28,25,23,0.35)] ${className ?? ''}`}
    >
      <div className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-medium text-stone-600">
        <Lock className="h-3 w-3" /> Plus
      </div>

      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-11 w-11 rounded-2xl bg-[hsl(var(--brand-ember)/0.08)] border border-[hsl(var(--brand-ember)/0.25)] flex items-center justify-center">
            <FileCheck className="h-5 w-5 text-[hsl(var(--brand-ember))]" />
          </div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--brand-ember))] font-semibold">
            PermitPath Plus · {priceLabel}
          </div>
        </div>

        <h3 className="text-xl md:text-2xl font-semibold text-stone-900 leading-tight tracking-tight">
          {title ?? 'Save your permits and track every step in one place.'}
        </h3>
        <p className="text-[15px] text-stone-600 mt-2.5 leading-relaxed">
          {subtitle ??
            'PermitPath Basic stays free — run it as often as you like. Plus adds the saved, tracked layer on top.'}
        </p>

        <div className="mt-7 grid gap-7 sm:grid-cols-2">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-stone-400 font-semibold mb-3">
              Basic · Free
            </div>
            <ul className="space-y-2.5 text-sm text-stone-600">
              {PERMIT_BASIC_FEATURES.map((line) => (
                <li key={line} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="sm:pl-7 sm:border-l sm:border-stone-200">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--brand-ember))] font-semibold mb-3">
              Plus · {priceLabel}
            </div>
            <ul className="space-y-2.5 text-sm text-stone-800">
              {PERMIT_PLUS_FEATURES.map((line) => (
                <li key={line} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--brand-ember))]" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-2.5">
          <Button
            size="sm"
            variant="cta"
            className="h-10"
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
            className="h-10 text-xs border-stone-200 bg-white hover:bg-stone-50 text-stone-700"
          >
            <Link to="/tools/permitpath">Use the free checklist</Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="h-10 text-xs text-stone-500 hover:text-stone-900 hover:bg-stone-100"
          >
            <Link to="/pricing">Compare plans</Link>
          </Button>
        </div>

        <p className="mt-4 text-[12px] text-stone-500">
          Included with Vendibook Pro. Cancel anytime — access continues through the paid period.
        </p>
      </div>
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
      <DialogContent className="max-w-2xl border-stone-200 bg-white p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>PermitPath Plus</DialogTitle>
          <DialogDescription>
            Saving and tracking permit roadmaps requires PermitPath Plus.
          </DialogDescription>
        </DialogHeader>
        <PermitPlusPanel
          className="border-0 shadow-none"
          title="Saving a roadmap is a Plus feature"
          subtitle="Your results stay on screen for free. Plus keeps them in your dashboard with status, documents and expiration tracking."
          returnPath={returnPath}
        />
      </DialogContent>
    </Dialog>
  );
}

export default PermitPlusPanel;
