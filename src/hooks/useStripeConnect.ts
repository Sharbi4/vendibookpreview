import { useCallback } from 'react';
import { usePayoutAccount } from '@/hooks/usePayoutAccount';

/**
 * DEPRECATED NAME — kept only so existing call sites keep compiling.
 *
 * Stripe Connect is fully retired at Vendibook. This hook performs NO Stripe
 * network calls: it reports PayPal payout readiness and routes any legacy
 * "connect"/"dashboard" action to the account payout settings.
 */
export const useStripeConnect = () => {
  const { payoutEmail, isPayoutReady, isLoading, isSaving, refresh } = usePayoutAccount();

  const goToPayoutSettings = useCallback(async () => {
    if (typeof window !== 'undefined') {
      window.location.assign('/account#section-payments');
    }
  }, []);

  return {
    isConnected: isPayoutReady,
    isOnboardingComplete: isPayoutReady,
    payoutsEnabled: isPayoutReady,
    hasAccountStarted: isPayoutReady,
    accountId: undefined as string | undefined,
    bankLast4: null as string | null,
    bankName: payoutEmail,
    isLoading,
    isConnecting: isSaving,
    isOpeningDashboard: false,
    /** Opens payout settings — no processor onboarding exists any more. */
    connectStripe: goToPayoutSettings,
    /** Opens payout settings — no processor dashboard exists any more. */
    openStripeDashboard: goToPayoutSettings,
    refreshStatus: refresh,
  };
};

export default useStripeConnect;
