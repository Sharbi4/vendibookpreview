import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface StripeConnectStatus {
  connected: boolean;
  onboarding_complete: boolean;
  payouts_enabled: boolean;
  account_id?: string;
  bank_last4?: string | null;
  bank_name?: string | null;
  provider: 'paypal';
  legacy_provider_disabled: true;
}

const DISABLED_STATUS: StripeConnectStatus = {
  connected: false,
  onboarding_complete: false,
  payouts_enabled: false,
  bank_last4: null,
  bank_name: null,
  provider: 'paypal',
  legacy_provider_disabled: true,
};

/**
 * Compatibility hook for screens that still import the former Stripe Connect
 * integration. Vendibook now uses PayPal for new checkout and payout flows.
 *
 * Important: this hook must never invoke a Stripe Edge Function during render.
 * The Stripe secret is intentionally absent after the PayPal cutover, and the
 * old status request previously produced a 500 that could blank the preview.
 */
export const useStripeConnect = () => {
  const { toast } = useToast();

  const showPayPalNotice = useCallback(async () => {
    toast({
      title: 'PayPal is now active',
      description: 'Stripe Connect is no longer used for new Vendibook payment or payout setup.',
    });
    return DISABLED_STATUS;
  }, [toast]);

  const refreshStatus = useCallback(async () => DISABLED_STATUS, []);

  return {
    isConnected: false,
    isOnboardingComplete: false,
    payoutsEnabled: false,
    hasAccountStarted: false,
    accountId: undefined,
    bankLast4: null,
    bankName: null,
    isLoading: false,
    isConnecting: false,
    isOpeningDashboard: false,
    connectStripe: async (_returnPath?: string) => showPayPalNotice(),
    openStripeDashboard: showPayPalNotice,
    refreshStatus,
  };
};
