import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type MyPayPalConnection = {
  id: string;
  onboarding_status: 'link_sent' | 'onboarding' | 'ready' | 'action_required' | 'disconnected';
  action_reasons: string[] | null;
  merchant_id: string | null;
  paypal_email: string | null;
  primary_email_confirmed: boolean | null;
  payments_receivable: boolean | null;
};

/**
 * The signed-in seller's own PayPal connection (owner-scoped by RLS).
 * Used for dashboard "needs your attention" prompts and listing readiness chips.
 */
export function useMyPayPalConnection() {
  const { user } = useAuth();
  const [connection, setConnection] = useState<MyPayPalConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setConnection(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data } = await supabase
      .from('seller_paypal_accounts')
      .select(
        'id, onboarding_status, action_reasons, merchant_id, paypal_email, primary_email_confirmed, payments_receivable',
      )
      .eq('user_id', user.id)
      .is('archived_at', null)
      .maybeSingle();
    setConnection((data as MyPayPalConnection) ?? null);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const status = connection?.onboarding_status ?? 'not_connected';
  const isReady =
    connection?.onboarding_status === 'ready' &&
    connection?.primary_email_confirmed === true &&
    connection?.payments_receivable === true &&
    !!connection?.merchant_id;

  return { connection, status, isReady, isLoading, reload: load };
}

export default useMyPayPalConnection;
