import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * MANUAL payout instructions for hosts and sellers.
 *
 * Vendibook collects every buyer payment through PayPal and records the
 * seller's proceeds internally (`seller_payables`). Payouts are then reviewed
 * and sent MANUALLY by Vendibook operations.
 *
 * This is deliberately NOT a connected payment account: there is no processor
 * onboarding, no merchant account, no automated payout API. The email below is
 * operational contact/destination info only, and nothing here gates publishing
 * or buyer checkout.
 */
export interface ManualPayoutInstructions {
  payoutEmail: string | null;
  updatedAt: string | null;
}

/** Where sellers edit their manual payout instructions. */
export const MANUAL_PAYOUT_SETTINGS_PATH = '/account#section-payments';

export const useManualPayout = () => {
  const { user } = useAuth();
  const [instructions, setInstructions] = useState<ManualPayoutInstructions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setInstructions(null);
      setIsLoading(false);
      return null;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('paypal_payout_email, paypal_payout_updated_at')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      const next: ManualPayoutInstructions = {
        payoutEmail: (data as any)?.paypal_payout_email ?? null,
        updatedAt: (data as any)?.paypal_payout_updated_at ?? null,
      };
      setInstructions(next);
      return next;
    } catch (err) {
      // Never blank the screen on a settings read — show "not provided" instead.
      console.error('Could not load payout instructions', err);
      setInstructions({ payoutEmail: null, updatedAt: null });
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
        throw new Error('Enter a valid email address.');
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
    payoutEmail: instructions?.payoutEmail ?? null,
    /** True once the seller has told us where to send a manual payout. */
    hasPayoutInstructions: Boolean(instructions?.payoutEmail),
    updatedAt: instructions?.updatedAt ?? null,
    isLoading,
    isSaving,
    savePayoutEmail,
    refresh,
  };
};

export default useManualPayout;
