import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type MyPayPalOnboardingStatus =
  | 'link_sent'
  | 'onboarding'
  | 'ready'
  | 'action_required'
  | 'disconnected'
  | 'revoked';

export type MyPayPalConnection = {
  id: string;
  onboarding_status: MyPayPalOnboardingStatus;
  action_reasons: string[] | null;
  merchant_id: string | null;
  paypal_email: string | null;
  primary_email_confirmed: boolean | null;
  payments_receivable: boolean | null;
  last_status_check_at: string | null;
};

const SELECT_COLUMNS =
  'id, onboarding_status, action_reasons, merchant_id, paypal_email, primary_email_confirmed, payments_receivable, last_status_check_at';

/** Re-ask PayPal at most this often per mounted view. */
const STALE_MS = 5 * 60 * 1000;

/**
 * The signed-in seller's own PayPal connection (owner-scoped by RLS).
 *
 * Reads the stored connection row, and — when that row is stale or not yet
 * ready — asks the backend to re-check the real status with PayPal
 * (`paypal-seller-onboarding` / `refresh_status`) so dashboard readiness
 * reflects PayPal's answer rather than a cached snapshot.
 *
 * No money, routing, or payout behaviour is affected by this hook.
 */
export function useMyPayPalConnection() {
  const { user } = useAuth();
  const [connection, setConnection] = useState<MyPayPalConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const autoChecked = useRef(false);

  const load = useCallback(async () => {
    if (!user) {
      setConnection(null);
      setIsLoading(false);
      return null;
    }
    setIsLoading(true);
    const { data } = await supabase
      .from('seller_paypal_accounts')
      .select(SELECT_COLUMNS)
      .eq('user_id', user.id)
      .is('archived_at', null)
      .maybeSingle();
    const row = (data as MyPayPalConnection) ?? null;
    setConnection(row);
    setIsLoading(false);
    return row;
  }, [user]);

  /** Ask PayPal for the live status, then re-read the stored row. */
  const refreshFromPayPal = useCallback(async (): Promise<MyPayPalConnection | null> => {
    if (!user) return null;
    setIsRefreshing(true);
    try {
      await supabase.functions.invoke('paypal-seller-onboarding', {
        body: { action: 'refresh_status' },
      });
    } catch {
      // A status lookup failure must never break the dashboard — fall back to
      // whatever we already have stored.
    } finally {
      setIsRefreshing(false);
    }
    return load();
  }, [user, load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const row = await load();
      if (cancelled || !row || autoChecked.current) return;
      const isSettled =
        row.onboarding_status === 'ready' &&
        row.primary_email_confirmed === true &&
        row.payments_receivable === true &&
        !!row.merchant_id;
      const checkedAt = row.last_status_check_at ? Date.parse(row.last_status_check_at) : 0;
      const isStale = !checkedAt || Date.now() - checkedAt > STALE_MS;
      const isTerminal =
        row.onboarding_status === 'disconnected' || row.onboarding_status === 'revoked';
      if (isTerminal || (isSettled && !isStale)) return;
      autoChecked.current = true;
      await refreshFromPayPal();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const status = connection?.onboarding_status ?? 'not_connected';
  const isReady =
    connection?.onboarding_status === 'ready' &&
    connection?.primary_email_confirmed === true &&
    connection?.payments_receivable === true &&
    !!connection?.merchant_id;

  return {
    connection,
    status,
    isReady,
    isLoading,
    isRefreshing,
    reload: load,
    refreshFromPayPal,
    lastCheckedAt: connection?.last_status_check_at ?? null,
  };
}

export default useMyPayPalConnection;
