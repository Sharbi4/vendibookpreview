import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type {
  PayoutMethod,
  PayoutPreferenceInput,
  PayoutPreferenceStatus,
} from '@/lib/payouts/methods';

/**
 * The seller's MANUAL payout preference (PayPal | Venmo | Cash App | ACH).
 *
 * Vendibook records seller proceeds internally and an admin reviews and sends
 * every payout by hand. Saving happens through the `payout-preference-save`
 * edge function so ACH numbers are validated and encrypted server-side and
 * never touch the client-readable table. Nothing here gates publishing,
 * buyer checkout, or listing visibility.
 */
export interface PayoutPreference {
  id: string;
  method: PayoutMethod;
  status: PayoutPreferenceStatus;
  display_label: string | null;
  masked_destination: string | null;
  ach_bank_name: string | null;
  ach_account_type: string | null;
  ach_account_last4: string | null;
  verified_at: string | null;
  updated_at: string | null;
}

const SELECT_COLUMNS =
  'id, method, status, display_label, masked_destination, ach_bank_name, ach_account_type, ach_account_last4, verified_at, updated_at';

export function usePayoutPreference() {
  const { user } = useAuth();
  const [preference, setPreference] = useState<PayoutPreference | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setPreference(null);
      setIsLoading(false);
      return null;
    }
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('payout_preferences')
        .select(SELECT_COLUMNS)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      setPreference((data as PayoutPreference) ?? null);
      return (data as PayoutPreference) ?? null;
    } catch (err) {
      // Never blank a settings screen on a read failure.
      console.error('Could not load payout preference');
      setPreference(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const savePreference = useCallback(
    async (input: PayoutPreferenceInput) => {
      if (!user?.id) throw new Error('You need to be signed in.');
      setIsSaving(true);
      try {
        const { data, error } = await supabase.functions.invoke('payout-preference-save', {
          body: input,
        });
        if (error) {
          // Surface the server's validation message when there is one.
          const ctx = (error as any)?.context;
          let message = 'We could not save your payout preference.';
          try {
            const parsed = ctx ? await ctx.json?.() : null;
            if (parsed?.error) message = parsed.error;
          } catch { /* keep the generic message */ }
          throw new Error(message);
        }
        if ((data as any)?.error) throw new Error((data as any).error);
        await refresh();
        return data as { pending_verification?: boolean };
      } finally {
        setIsSaving(false);
      }
    },
    [user?.id, refresh],
  );

  return {
    preference,
    hasPreference: Boolean(preference),
    isLoading,
    isSaving,
    savePreference,
    refresh,
  };
}

export default usePayoutPreference;
