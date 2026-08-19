/**
 * useSubscriptionManagement — provider-aware subscription state + controls.
 *
 * Vendibook bills new memberships through PayPal; a small number of legacy
 * members remain on a retired processor. This hook resolves the row in
 * `host_subscriptions`, detects which provider owns it, and exposes the right
 * management action for that provider:
 *
 *   PayPal  → cancel via `paypal-subscription-cancel` (cancels at PayPal first,
 *             access continues through the paid period). Payment-method changes
 *             happen in the member's PayPal automatic-payments settings.
 *   Legacy  → read-only: cancellations and billing changes are handled by
 *             support; no provider API is ever called.
 *
 * No money logic lives here — every mutation is an edge-function call.
 */
import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { parseEdgeError } from '@/lib/edgeErrors';

export type SubscriptionProvider = 'paypal' | 'legacy' | 'none';

/** Where PayPal members manage the funding source for a recurring plan. */
export const PAYPAL_AUTOPAY_URL = 'https://www.paypal.com/myaccount/autopay/';

export interface SubscriptionRow {
  id?: string;
  status?: string | null;
  tier?: string | null;
  payment_provider?: string | null;
  paypal_subscription_id?: string | null;
  stripe_subscription_id?: string | null;
  cancel_at_period_end?: boolean | null;
  cancel_at?: string | null;
  current_period_end?: string | null;
  [key: string]: unknown;
}

export function fmtSubDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return '—'; }
}

/** Recurring products that can own a `host_subscriptions` row. */
export type SubscriptionProduct = 'pro' | 'permit_path_plus' | 'any';

const PRO_SLUGS = new Set(['vendibook_pro', 'vendibook-pro', 'pro', 'host_pro', 'host-pro', 'host_growth']);
const PERMIT_SLUGS = new Set(['permit_path_plus', 'permit-path-plus', 'permitpath_plus']);

const normalizeSlug = (raw?: string | null) =>
  String(raw ?? '').toLowerCase().replace(/_(monthly|annual)$/, '').replace(/-(monthly|annual)$/, '');

export function matchesProduct(row: SubscriptionRow | null, product: SubscriptionProduct): boolean {
  if (!row) return false;
  if (product === 'any') return true;
  const key = normalizeSlug(row.tier);
  if (product === 'permit_path_plus') return PERMIT_SLUGS.has(key);
  // Pro: explicit slugs, `*_pro` variants, and legacy rows with no tier
  // recorded (those predate multi-product billing and were always Pro).
  if (!key) return !PERMIT_SLUGS.has(key);
  return PRO_SLUGS.has(key) || key.endsWith('_pro');
}

/**
 * @param product Which recurring product this surface manages. Defaults to
 * Vendibook Pro so a future PermitPath Plus row can never replace the Pro row
 * or cause the wrong PayPal subscription to be cancelled.
 */
export function useSubscriptionManagement(product: SubscriptionProduct = 'pro') {
  const { user } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState<'cancel' | 'reactivate' | 'portal' | null>(null);

  const query = useQuery({
    queryKey: ['subscription-management', user?.id, product],
    enabled: !!user?.id,
    queryFn: async (): Promise<SubscriptionRow | null> => {
      const { data } = await supabase
        .from('host_subscriptions')
        .select('*')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false });
      const rows = (data as SubscriptionRow[] | null) ?? [];
      const scoped = rows.filter((row) => matchesProduct(row, product));
      // Prefer a live row over a lapsed one of the same product.
      return (
        scoped.find((r) => (r.status ?? 'canceled') !== 'canceled') ?? scoped[0] ?? null
      );
    },
  });

  const sub = query.data ?? null;

  const provider: SubscriptionProvider =
    sub?.payment_provider === 'paypal' || sub?.paypal_subscription_id
      ? 'paypal'
      : sub?.stripe_subscription_id
      ? 'legacy'
      : 'none';

  const hasSubscription =
    provider !== 'none' && (sub?.status ?? 'canceled') !== 'canceled';

  const scheduledCancel = !!sub?.cancel_at_period_end && sub?.status !== 'canceled';
  const isPastDue = sub?.status === 'past_due' || sub?.status === 'unpaid';
  const accessEndsAt = sub?.cancel_at ?? sub?.current_period_end ?? null;


  /** Poll until the webhook mirror lands (both providers sync async). */
  const refetchUntilSynced = useCallback(
    async (matches: (row: SubscriptionRow | null) => boolean) => {
      for (let i = 0; i < 6; i++) {
        const { data } = await query.refetch();
        if (matches((data as SubscriptionRow) ?? null)) return;
        await new Promise((r) => setTimeout(r, 700));
      }
    },
    [query],
  );

  const cancel = useCallback(async () => {
    setBusy('cancel');
    try {
      if (provider === 'paypal') {
        const { data, error } = await supabase.functions.invoke('paypal-subscription-cancel', {
          body: {
            reason: 'Member requested cancellation',
            // Pin the exact subscription so a second recurring product can
            // never be cancelled by mistake.
            paypal_subscription_id: sub?.paypal_subscription_id ?? undefined,
          },
        });

        if (error) throw error;
        toast({
          title: 'Membership cancelled',
          description:
            (data as { message?: string })?.message ??
            'Access continues until the end of your paid period.',
        });
        await refetchUntilSynced(
          (row) => row?.status === 'canceled' || !!row?.cancel_at_period_end,
        );
      } else {
        // Legacy memberships are read-only — the old processor is retired and
        // must never be called. Support cancels these by hand.
        toast({
          title: 'Contact support to cancel',
          description:
            'This legacy membership is managed by our team. Email support@vendibook.com or call (725) 755-9598 and we’ll cancel it right away.',
        });
      }
    } catch (err) {
      const parsed = await parseEdgeError(err);
      toast({
        title: 'Could not cancel subscription',
        description: parsed?.message ?? (err instanceof Error ? err.message : 'Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  }, [provider, sub?.paypal_subscription_id, refetchUntilSynced, toast]);

  /** Legacy memberships can no longer be resumed self-serve. */
  const reactivate = useCallback(async () => {
    toast({
      title: 'Contact support',
      description:
        'This legacy membership is managed by our team. Email support@vendibook.com and we’ll resume it for you.',
    });
  }, [toast]);

  /**
   * Opens the billing surface. PayPal members manage their funding source in
   * PayPal's automatic-payments settings; legacy members are pointed at
   * support because the old billing portal is retired.
   */
  const openBilling = useCallback(async () => {
    if (provider === 'paypal') {
      window.open(PAYPAL_AUTOPAY_URL, '_blank', 'noopener,noreferrer');
      return;
    }
    toast({
      title: 'Billing managed by support',
      description:
        'This legacy membership predates PayPal billing. Email support@vendibook.com for invoices or payment changes.',
    });
  }, [provider, toast]);


  return {
    sub,
    provider,
    hasSubscription,
    scheduledCancel,
    isPastDue,
    accessEndsAt,
    /** PayPal cancellations are immediate-at-provider, so there's no resume. */
    canReactivate: false,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
    busy,
    cancel,
    reactivate,
    openBilling,
  };
}

export default useSubscriptionManagement;
