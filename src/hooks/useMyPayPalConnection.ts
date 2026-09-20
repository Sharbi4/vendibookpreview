import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { parseEdgeError } from '@/lib/edgeErrors';

export type MyPayPalOnboardingStatus = 'link_sent' | 'onboarding' | 'ready' | 'action_required' | 'disconnected' | 'revoked';
export type MyPayPalConnection = {
  id: string; onboarding_status: MyPayPalOnboardingStatus; action_reasons: string[] | null;
  merchant_id: string | null; paypal_email: string | null; primary_email_confirmed: boolean | null;
  payments_receivable: boolean | null; last_status_check_at: string | null;
  referral_url: string | null; oauth_scopes: string[]; consent_granted: boolean;
  acdc_vetting_status: string | null; vaulting_status: string | null;
};
const COLUMNS = 'id, onboarding_status, action_reasons, merchant_id, paypal_email, primary_email_confirmed, payments_receivable, last_status_check_at, referral_url, oauth_scopes, consent_granted, acdc_vetting_status, vaulting_status';
const activeRefreshes = new Map<string, Promise<void>>();
async function refreshSeller(userId: string) {
  let pending = activeRefreshes.get(userId);
  if (!pending) {
    pending = (async () => {
      const { data, error } = await supabase.functions.invoke('paypal-seller-onboarding', { body: { action: 'refresh_status' } });
      if (error || data?.error) {
        const parsed = await parseEdgeError(error, data?.error ? data : null);
        throw new Error(parsed.message);
      }
    })().finally(() => activeRefreshes.delete(userId));
    activeRefreshes.set(userId, pending);
  }
  return pending;
}
async function readConnection(userId: string) {
  const { data, error } = await supabase.from('seller_paypal_accounts').select(COLUMNS).eq('user_id', userId).is('archived_at', null).maybeSingle();
  if (error) throw error;
  return data as MyPayPalConnection | null;
}

/** Account-keyed status; focus and polling recover signup in another PayPal tab.
 * Callback flags never establish consent or enable payments. */
export function useMyPayPalConnection() {
  const { user } = useAuth();
  const userId = user?.id;
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['my-paypal-connection', userId], enabled: !!userId, staleTime: 15_000, refetchOnWindowFocus: true,
    refetchInterval: q => q.state.data?.connection && !['ready', 'disconnected', 'revoked'].includes(q.state.data.connection.onboarding_status) ? 30_000 : false,
    queryFn: async () => {
      let row = await readConnection(userId!);
      let refreshError: string | null = null;
      const checked = Date.parse(row?.last_status_check_at || '') || 0;
      const incomplete = row && (row.onboarding_status !== 'ready' || !row.oauth_scopes?.length || !row.consent_granted);
      if (row && !['disconnected', 'revoked'].includes(row.onboarding_status) && Date.now() - checked > (incomplete ? 15_000 : 300_000)) {
        try { await refreshSeller(userId!); row = await readConnection(userId!); void client.invalidateQueries({ queryKey: ['seller-payment-readiness', userId] }); }
        catch (error) { refreshError = error instanceof Error ? error.message : "Couldn't verify PayPal status."; }
      }
      return { connection: row, refreshError };
    },
  });
  useEffect(() => {
    const onFocus = () => { if (userId) void query.refetch(); };
    const onVisible = () => { if (document.visibilityState === 'visible') onFocus(); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('pageshow', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pageshow', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId, query.refetch]);
  const reload = useCallback(async () => {
    if (!userId) return null;
    const row = await readConnection(userId);
    client.setQueryData(['my-paypal-connection', userId], { connection: row, refreshError: null });
    void client.invalidateQueries({ queryKey: ['seller-payment-readiness', userId] });
    return row;
  }, [userId, client]);
  const refreshFromPayPal = useCallback(async () => {
    if (!userId) return null;
    try { await refreshSeller(userId); return await reload(); }
    catch (error) {
      const message = error instanceof Error ? error.message : "Couldn't verify PayPal status.";
      client.setQueryData(['my-paypal-connection', userId], (old: any) => ({ ...old, refreshError: message }));
      return null;
    }
  }, [userId, client, reload]);
  const connection = userId ? query.data?.connection ?? null : null;
  const isReady = connection?.onboarding_status === 'ready' && connection.primary_email_confirmed === true && connection.payments_receivable === true && connection.consent_granted === true && !!connection.merchant_id && !!connection.oauth_scopes?.length;
  return { connection, status: connection?.onboarding_status ?? 'not_connected', isReady,
    isLoading: !!userId && query.isLoading, isRefreshing: query.isFetching,
    lastRefreshError: query.error?.message || query.data?.refreshError || null,
    reload, refreshFromPayPal, lastCheckedAt: connection?.last_status_check_at ?? null };
}
export default useMyPayPalConnection;
