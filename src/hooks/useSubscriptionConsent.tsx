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

type CheckoutOpts = Omit<StartCheckoutInput, 'productSlug' | 'consentId'>;

export interface UseSubscriptionConsentResult {
  /**
   * Kick off checkout. For recurring products this opens the consent dialog
   * and only invokes the edge function after the user affirmatively consents.
   * For one-time products it starts checkout immediately.
   */
  requestCheckout: (product: MonetizationProduct, opts?: CheckoutOpts) => Promise<void>;
  /** Element that MUST be rendered by the caller. */
  dialog: React.ReactNode;
  /** True while awaiting user consent or Stripe response. */
  pendingSlug: string | null;
}

interface PendingRecurring {
  product: MonetizationProduct;
  opts: CheckoutOpts;
  payload: SubscriptionConsentPayload;
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
          ...opts,
        });
        window.location.href = url;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not start checkout';
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const interval = ((product as any).metadata?.interval as string) || 'month';
      setPending({
        product,
        opts,
        payload: {
          productSlug: product.slug,
          productName: product.name,
          priceCents,
          interval,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tier: (product as any).slug ?? null,
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
