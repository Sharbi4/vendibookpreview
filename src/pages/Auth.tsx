import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTracking } from '@/hooks/usePageTracking';
import { Loader2 } from 'lucide-react';
import { AuthMarketingPanel } from '@/components/auth/AuthMarketingPanel';
import { AuthFormPanel } from '@/components/auth/AuthFormPanel';
import { supabase } from '@/integrations/supabase/client';

type AuthMode = 'signin' | 'signup' | 'forgot' | 'verify';

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Track page views with Google Analytics
  usePageTracking();
  
  const rawRedirect =
    searchParams.get('redirect') || searchParams.get('returnTo') || '';
  const redirectUrl =
    rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
      ? rawRedirect
      : '';

  // Check for mode in URL params
  useEffect(() => {
    const urlMode = searchParams.get('mode');
    if (urlMode === 'signup' || urlMode === 'signin' || urlMode === 'forgot' || urlMode === 'verify') {
      setMode(urlMode);
    }
  }, [searchParams]);

  // The welcome flow is a one-time, new-account-only experience.
  // Source of truth: profiles.onboarded_at (persisted by /welcome).
  // A signed-in account only qualifies when it has no onboarded_at AND the
  // account itself was created moments ago. Any older account missing the
  // timestamp is backfilled immediately so it can never qualify again.
  const NEW_ACCOUNT_WINDOW_MS = 10 * 60 * 1000;

  const isFreshAccount = (user: User, profileCreatedAt?: string | null): boolean => {
    const created = new Date(user.created_at || profileCreatedAt || 0).getTime();
    if (!created) return false;
    return Date.now() - created < NEW_ACCOUNT_WINDOW_MS;
  };

  useEffect(() => {
    if (user && !isLoading) {
      let cancelled = false;
      (async () => {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('onboarded_at, created_at')
            .eq('id', user.id)
            .maybeSingle();
          if (cancelled) return;

          if (!data?.onboarded_at) {
            if (isFreshAccount(user, data?.created_at)) {
              const rt = redirectUrl || '/dashboard';
              navigate(`/welcome?returnTo=${encodeURIComponent(rt)}`, { replace: true });
              return;
            }
            // Existing account without the flag: mark as onboarded so the
            // welcome screen is never evaluated for them again.
            await supabase
              .from('profiles')
              .update({ onboarded_at: new Date().toISOString() })
              .eq('id', user.id);
          }
        } catch {
          /* fall through to normal redirect */
        }
        if (!cancelled) navigate(redirectUrl || '/dashboard');
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [user, isLoading, navigate, redirectUrl]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Marketing Panel - Compact on mobile/tablet, full on desktop */}
      <div className="lg:w-1/2 xl:w-[55%]">
        <AuthMarketingPanel mode={mode} />
      </div>
      
      {/* Right Panel - Auth Form */}
      <div className="w-full lg:w-1/2 xl:w-[45%]">
        <AuthFormPanel mode={mode} setMode={setMode} />
      </div>
    </div>
  );
};

export default Auth;
