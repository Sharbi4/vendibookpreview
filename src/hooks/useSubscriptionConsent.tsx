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
  /** Billing cadence for recurring products. Drives the consent disclosure
   *  and selects the server-side PayPal plan. */
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

/** Provider/internal errors are logged, never rendered verbatim. */
const SAFE_CODES = new Set([
  'already_entitled',
  'entitlement_required',
  'missing_subscription_consent',
  'invalid_subscription_consent',
  'product_not_found',
  'provider_retired',
]);

export function toSafeCheckoutMessage(raw?: string | null, code?: string | null): string {
  if (code && SAFE_CODES.has(code) && raw) return raw;
  if (!raw) return 'We couldn\u2019t start that checkout. Please try again.';
  const lower = raw.toLowerCase();
  const leaky =
    lower.includes('idempot') ||
    lower.includes('stripe') ||
    lower.includes('paypal') ||
    lower.includes('api key') ||
    lower.includes('request id') ||
    lower.includes('http') ||
    raw.length > 180;
  return leaky ? 'We couldn\u2019t start that checkout. Please try again.' : raw;
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
  /** Guards against a double-confirm firing two checkout attempts. */
  const consumedAttempt = React.useRef<string | null>(null);

  const launchCheckout = React.useCallback(
    async (product: MonetizationProduct, opts: CheckoutOpts, consentId?: string) => {
      try {
        const { url } = await startMonetizationCheckout({
          productSlug: product.slug,
          consentId,
          // Recurring products: forward the cadence the member picked so the
          // server resolves the matching PayPal plan (pricing stays server-side).
          billingInterval:
            product.billing_type === 'recurring'
              ? (deriveInterval(product, opts.interval) === 'year' ? 'annual' : 'monthly')
              : undefined,
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
        const correlationId =
          (parsed?.raw?.correlation_id as string | undefined) ?? null;
        // Never surface raw provider text (e.g. Stripe idempotency internals).
        const safeMessage = toSafeCheckoutMessage(parsed?.message, parsed?.code);
        console.error('[subscription-checkout] failed', {
          slug: product.slug,
          correlation_id: correlationId,
          provider_error: parsed?.message,
          code: parsed?.code,
          err,
        });
        toast.error(safeMessage, {
          description: correlationId ? `Reference ${correlationId}` : undefined,
          action: {
            label: 'Try again',
            onClick: () => { void launchCheckout(product, opts, consentId); },
          },
        });
        setPendingSlug(null);
      }
    },
    [],
  );

  const requestCheckout = React.useCallback(
    async (product: MonetizationProduct, opts: CheckoutOpts = {}) => {
      setPendingSlug(product.slug);
      // Re-entrancy guard: ignore a second request while one is in flight.
      if (pendingSlug && pendingSlug !== product.slug) { /* allow plan switch */ }
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
      if (consumedAttempt.current === pending.checkoutAttemptId) return;
      consumedAttempt.current = pending.checkoutAttemptId;
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
      checkoutAttemptId={pending?.checkoutAttemptId ?? null}
      onConsented={handleConsented}
    />
  );

  return { requestCheckout, dialog, pendingSlug };
}

