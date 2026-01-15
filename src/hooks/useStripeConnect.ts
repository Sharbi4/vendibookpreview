import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface StripeConnectStatus {
  connected: boolean;
  onboarding_complete: boolean;
  account_id?: string;
}

export const useStripeConnect = () => {
  const { user, session } = useAuth();
  const [status, setStatus] = useState<StripeConnectStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isOpeningDashboard, setIsOpeningDashboard] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!session?.access_token) {
      setStatus(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-stripe-connect', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      setStatus(data);
    } catch (error) {
      console.error('Error checking Stripe Connect status:', error);
      setStatus({ connected: false, onboarding_complete: false });
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const connectStripe = async () => {
    if (!session?.access_token) return;

    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-connect', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error connecting Stripe:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const openStripeDashboard = async () => {
    if (!session?.access_token) return;

    setIsOpeningDashboard(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-dashboard-link', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening Stripe dashboard:', error);
      throw error;
    } finally {
      setIsOpeningDashboard(false);
    }
  };

  return {
    // Only consider "connected" when both account exists AND onboarding is complete
    isConnected: (status?.connected && status?.onboarding_complete) ?? false,
    isOnboardingComplete: status?.onboarding_complete ?? false,
    hasAccountStarted: status?.connected ?? false, // Account created but may not be fully set up
    accountId: status?.account_id,
    isLoading,
    isConnecting,
    isOpeningDashboard,
    connectStripe,
    openStripeDashboard,
    refreshStatus: checkStatus,
  };
};
