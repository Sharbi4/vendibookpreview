import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Payout destination for hosts and sellers.
 *
 * Vendibook captures every payment through PayPal and records the seller's
 * proceeds internally (seller_payables). Money is sent out with PayPal Payouts
 * to the email below — there is no processor onboarding to complete.
 */
export interface PayoutAccount {
  payoutEmail: string | null;
  verifiedAt: string | null;
}

export const usePayoutAccount = () => {
  const { user } = useAuth();
  const [account, setAccount] = useState<PayoutAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setAccount(null);
      setIsLoading(false);
      return null;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('paypal_payout_email, paypal_payout_verified_at')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      const next: PayoutAccount = {
        payoutEmail: (data as any)?.paypal_payout_email ?? null,
        verifiedAt: (data as any)?.paypal_payout_verified_at ?? null,
      };
      setAccount(next);
      return next;
    } catch (err) {
      // Never blank the screen on a settings read — show "not set up" instead.
      console.error('Could not load payout destination', err);
      setAccount({ payoutEmail: null, verifiedAt: null });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const savePayoutEmail = useCallback(
    async (email: string) => {
      if (!user?.id) throw new Error('You need to be signed in.');
      const trimmed = email.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
        throw new Error('Enter a valid PayPal email address.');
      }
      setIsSaving(true);
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            paypal_payout_email: trimmed,
            paypal_payout_updated_at: new Date().toISOString(),
          } as any)
          .eq('id', user.id);
        if (error) throw error;
        await refresh();
      } finally {
        setIsSaving(false);
      }
    },
    [user?.id, refresh],
  );

  return {
    payoutEmail: account?.payoutEmail ?? null,
    isPayoutReady: Boolean(account?.payoutEmail),
    verifiedAt: account?.verifiedAt ?? null,
    isLoading,
    isSaving,
    savePayoutEmail,
    refresh,
  };
};

export default usePayoutAccount;
