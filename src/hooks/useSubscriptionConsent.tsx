/**
 * useSubscriptionConsent — gate hook for recurring monetization checkouts.
 *
 * Usage:
 *   const { requestCheckout, dialog } = useSubscriptionConsent();
 *   // one-time products go straight through; recurring products open the
 *   // consent dialog first and forward the returned consent_id to the
 *   // edge function.
 *   await requestCheckout(product, { listingId, successPath, cancelPath });
 *   return <>{card}{dialog}</>;
 *
 * The consent dialog is rendered by this hook, so call sites just splat
 * `dialog` next to their existing JSX.
 */
import * as React from 'react';
import { toast } from 'sonner';
import {
  effectivePriceCents,
  startMonetizationCheckout,
  type MonetizationProduct,
  type StartCheckoutInput,
} from '@/lib/monetization/products';
import {
  SubscriptionConsentDialog,
  type SubscriptionConsentPayload,
} from '@/components/monetization/SubscriptionConsentDialog';
import { parseEdgeError } from '@/lib/edgeErrors';

type CheckoutOpts = Omit<StartCheckoutInput, 'productSlug' | 'consentId'> & {
  /** UI billing cadence. Controls consent-dialog disclosure wording only —
   *  the actual billing interval is dictated by the Stripe price. */
  interval?: 'monthly' | 'annual' | 'month' | 'year';
};

export interface UseSubscriptionConsentResult {
  requestCheckout: (product: MonetizationProduct, opts?: CheckoutOpts) => Promise<void>;
  dialog: React.ReactNode;
  pendingSlug: string | null;
}

interface PendingRecurring {
  product: MonetizationProduct;
  opts: CheckoutOpts;
  payload: SubscriptionConsentPayload;
  checkoutAttemptId: string;
}

function deriveInterval(product: MonetizationProduct, hint?: CheckoutOpts['interval']): 'month' | 'year' {
  if (hint === 'annual' || hint === 'year') return 'year';
  if (hint === 'monthly' || hint === 'month') return 'month';
  if (product.slug.endsWith('_annual') || product.slug.endsWith('_yearly')) return 'year';
  return 'month';
}

function genAttemptId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  } catch { /* fall through */ }
  return `att_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function useSubscriptionConsent(): UseSubscriptionConsentResult {
  const [pending, setPending] = React.useState<PendingRecurring | null>(null);
  const [pendingSlug, setPendingSlug] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);

  const launchCheckout = React.useCallback(
    async (product: MonetizationProduct, opts: CheckoutOpts, consentId?: string) => {
      try {
        const { url } = await startMonetizationCheckout({
          productSlug: product.slug,
          consentId,
          listingId: opts.listingId,
          discountCode: opts.discountCode,
          successPath: opts.successPath,
          cancelPath: opts.cancelPath,
        });
        // Break out of preview iframe if we're embedded, otherwise same-tab redirect.
        const top = typeof window !== 'undefined' ? window.top : null;
        if (top && top !== window) {
          try { top.location.href = url; return; } catch { /* cross-origin — fall through */ }
        }
        window.location.href = url;
      } catch (err) {
        const parsed = await parseEdgeError(err);
        const msg = parsed?.message || (err instanceof Error ? err.message : 'Could not start checkout');
        console.error('[subscription-checkout] failed', { slug: product.slug, err, parsed });
        toast.error(msg);
        setPendingSlug(null);
      }
    },
    [],
  );

  const requestCheckout = React.useCallback(
    async (product: MonetizationProduct, opts: CheckoutOpts = {}) => {
      setPendingSlug(product.slug);
      if (product.billing_type !== 'recurring') {
        await launchCheckout(product, opts);
        return;
      }
      const priceCents = effectivePriceCents(product);
      const interval = deriveInterval(product, opts.interval);
      const checkoutAttemptId = genAttemptId();
      setPending({
        product,
        opts,
        checkoutAttemptId,
        payload: {
          productSlug: product.slug,
          productName: product.name,
          priceCents,
          interval,
          tier: product.slug ?? null,
        },
      });
      setOpen(true);
    },
    [launchCheckout],
  );

  const handleConsented = React.useCallback(
    async (consentId: string) => {
      if (!pending) return;
      await launchCheckout(pending.product, pending.opts, consentId);
    },
    [pending, launchCheckout],
  );

  const dialog = (
    <SubscriptionConsentDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setPending(null);
          setPendingSlug(null);
        }
      }}
      payload={pending?.payload ?? null}
      onConsented={handleConsented}
    />
  );

  return { requestCheckout, dialog, pendingSlug };
}

