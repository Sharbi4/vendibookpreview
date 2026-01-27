import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { useLocation } from 'react-router-dom';

// Google Client ID - this is a publishable key, safe to include in client code
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            context?: 'signin' | 'signup' | 'use';
            itp_support?: boolean;
          }) => void;
          prompt: (callback?: (notification: {
            isDisplayed: () => boolean;
            isNotDisplayed: () => boolean;
            getNotDisplayedReason: () => string;
            isSkippedMoment: () => boolean;
            getSkippedReason: () => string;
            isDismissedMoment: () => boolean;
            getDismissedReason: () => string;
          }) => void) => void;
          cancel: () => void;
        };
      };
    };
  }
}

interface GoogleOneTapProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const GoogleOneTap = ({ onSuccess, onError }: GoogleOneTapProps) => {
  // NOTE: We intentionally do NOT use useAuth() here.
  // In dev with HMR/Fast Refresh, a context module edit can temporarily
  // create a new context instance, making consumers see `undefined`.
  // Google One Tap is optional and should never blank-screen the app.
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const initialized = useRef(false);

  // Keep local auth state in sync (no AuthContext dependency)
  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setUser(data.session?.user ?? null);
        setIsLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setIsLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleCredentialResponse = useCallback(async (response: { credential: string }) => {
    try {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
      });

      if (error) {
        console.error('One Tap sign-in error:', error);
        onError?.(error.message);
        return;
      }

      if (data.user) {
        console.log('One Tap sign-in successful');
        onSuccess?.();
      }
    } catch (err: any) {
      console.error('One Tap error:', err);
      onError?.(err.message || 'Sign-in failed');
    }
  }, [onSuccess, onError]);

  useEffect(() => {
    // Don't show One Tap if:
    // - User is already logged in
    // - Still loading auth state
    // - Already on auth page (user is actively signing in)
    // - No client ID configured
    // - Already initialized
    if (user || isLoading || location.pathname === '/auth' || !GOOGLE_CLIENT_ID || initialized.current) {
      return;
    }

    // Load the Google Identity Services script
    const loadGoogleScript = () => {
      if (document.getElementById('google-identity-script')) {
        initializeOneTap();
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-identity-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeOneTap;
      document.head.appendChild(script);
    };

    const initializeOneTap = () => {
      if (!window.google?.accounts?.id || initialized.current) return;

      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: true, // Auto-select for returning users
          cancel_on_tap_outside: true,
          context: 'signin',
          itp_support: true, // Better Safari support
        });

        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed()) {
            console.log('One Tap not displayed:', notification.getNotDisplayedReason());
          } else if (notification.isSkippedMoment()) {
            console.log('One Tap skipped:', notification.getSkippedReason());
          } else if (notification.isDismissedMoment()) {
            console.log('One Tap dismissed:', notification.getDismissedReason());
          }
        });

        initialized.current = true;
      } catch (err) {
        console.error('Failed to initialize One Tap:', err);
      }
    };

    // Small delay to ensure page is ready
    const timer = setTimeout(loadGoogleScript, 500);

    return () => {
      clearTimeout(timer);
      // Cancel One Tap when component unmounts
      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
    };
  }, [user, isLoading, location.pathname, handleCredentialResponse]);

  // This component doesn't render anything visible - One Tap is a Google overlay
  return null;
};

export default GoogleOneTap;
