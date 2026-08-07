import React, { useState, useEffect } from 'react';
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

  // Only show the post-signup welcome to newly-created accounts. Existing
  // users who sign in without an onboarded_at timestamp should land on their
  // dashboard, not the new-user onboarding flow.
  const isNewUser = (user: User): boolean => {
    const createdAt = new Date(user.created_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
    return diffMinutes < 10;
  };

  useEffect(() => {
    if (user && !isLoading) {
      let cancelled = false;
      (async () => {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('onboarded_at')
            .eq('id', user.id)
            .maybeSingle();
          if (cancelled) return;
          if (!data?.onboarded_at && isNewUser(user)) {
            const rt = redirectUrl || '/dashboard';
            navigate(`/welcome?returnTo=${encodeURIComponent(rt)}`, { replace: true });
            return;
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
