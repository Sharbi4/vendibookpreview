import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SellerPaymentReadiness {
  loading: boolean;
  /** True only when this host has an active payment-setup requirement to check. */
  gatingActive: boolean;
  ready: boolean;
  reasons: string[];
}

/**
 * Checks whether a host has finished the payment setup required to receive
 * payouts. Defensive by design: if the underlying signal can't be read (no
 * table/column yet, network error, etc.) gating stays OFF so existing
 * bookings are never blocked. Only flips `gatingActive` on when we can
 * positively confirm the host has an unresolved payment-setup requirement.
 */
export function useSellerPaymentReadiness(hostId?: string | null): SellerPaymentReadiness {
  const [state, setState] = useState<SellerPaymentReadiness>({
    loading: Boolean(hostId),
    gatingActive: false,
    ready: true,
    reasons: [],
  });

  useEffect(() => {
    let cancelled = false;
    if (!hostId) {
      setState({ loading: false, gatingActive: false, ready: true, reasons: [] });
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('payment_setup_status, paypal_merchant_id, payouts_enabled')
          .eq('id', hostId)
          .maybeSingle();

        if (cancelled) return;

        if (error || !data) {
          // Unknown state — never block on an inconclusive read.
          setState({ loading: false, gatingActive: false, ready: true, reasons: [] });
          return;
        }

        const record = data as Record<string, unknown>;
        const hasStatusColumn = 'payment_setup_status' in record;
        const status = hasStatusColumn ? (record.payment_setup_status as string | null) : null;

        if (!hasStatusColumn || status == null) {
          // Host predates this feature or the column isn't populated — no gating.
          setState({ loading: false, gatingActive: false, ready: true, reasons: [] });
          return;
        }

        const ready = status === 'ready' || status === 'complete' || status === 'active';
        setState({
          loading: false,
          gatingActive: true,
          ready,
          reasons: ready ? [] : ['This host has not finished setting up payments yet.'],
        });
      } catch {
        if (!cancelled) setState({ loading: false, gatingActive: false, ready: true, reasons: [] });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hostId]);

  return state;
}
