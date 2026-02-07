import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface StripeConnectStatus {
  connected: boolean;
  onboarding_complete: boolean;
  account_id?: string;
}

export const useStripeConnect = () => {
  const { user, session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
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
      return data;
    } catch (error) {
      console.error('Error checking Stripe Connect status:', error);
      setStatus({ connected: false, onboarding_complete: false });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token]);

  // Handle return from Stripe onboarding
  useEffect(() => {
    const stripeParam = searchParams.get('stripe');
    
    if (stripeParam === 'complete' || stripeParam === 'refresh') {
      // Remove the query param to clean up the URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('stripe');
      setSearchParams(newParams, { replace: true });
      
      // Refresh status after returning from Stripe
      const refreshAfterReturn = async () => {
        setIsLoading(true);
        // Small delay to allow Stripe to propagate the status
        await new Promise(resolve => setTimeout(resolve, 1000));
        const result = await checkStatus();
        
        if (stripeParam === 'complete') {
          if (result?.onboarding_complete) {
            toast({
              title: 'Stripe Connected! 🎉',
              description: 'Your payout account is now set up and ready to receive payments.',
            });
          } else if (result?.connected) {
            toast({
              title: 'Almost there!',
              description: 'Please complete your Stripe onboarding to start receiving payments.',
              variant: 'default',
            });
          }
        }
      };
      
      refreshAfterReturn();
    }
  }, [searchParams, setSearchParams, checkStatus, toast]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const connectStripe = async (returnPath?: string) => {
    if (!session?.access_token) return;

    // Open window immediately to avoid popup blocker
    const newWindow = window.open('about:blank', '_blank');

    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-connect', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { returnPath: returnPath || window.location.pathname },
      });

      if (error) throw error;
      
      if (data?.url && newWindow) {
        newWindow.location.href = data.url;
      } else if (data?.url) {
        // Fallback if window was blocked
        window.location.href = data.url;
      } else if (newWindow) {
        newWindow.close();
      }
    } catch (error) {
      console.error('Error connecting Stripe:', error);
      if (newWindow) newWindow.close();
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const openStripeDashboard = async () => {
    if (!session?.access_token) return;

    // Open window immediately to avoid popup blocker
    // The browser blocks window.open calls that happen after async operations
    const newWindow = window.open('about:blank', '_blank');

    setIsOpeningDashboard(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-dashboard-link', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      
      if (data?.url && newWindow) {
        newWindow.location.href = data.url;
      } else if (data?.url) {
        // Fallback if window was blocked
        window.location.href = data.url;
      } else if (newWindow) {
        newWindow.close();
      }
    } catch (error) {
      console.error('Error opening Stripe dashboard:', error);
      if (newWindow) newWindow.close();
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
