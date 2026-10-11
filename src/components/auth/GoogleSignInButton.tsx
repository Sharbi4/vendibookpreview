import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

interface GoogleSignInButtonProps {
  /** Rendered width in px (Google requires a fixed pixel width). */
  width?: number;
  className?: string;
}

/**
 * Compact Google Identity Services button, rendered inline (e.g. next to the
 * hero CTAs). Signed-in visitors render nothing. Uses the same
 * signInWithIdToken flow as One Tap and never blocks the page if GIS fails.
 */
const GoogleSignInButton = ({ width = 200, className }: GoogleSignInButtonProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setUser(data.session?.user ?? null);
    }).catch(() => undefined);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (mounted) setUser(session?.user ?? null);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleCredential = useCallback(async (response: { credential: string }) => {
    try {
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
      });
      if (error) console.error('Google sign-in error:', error.message);
    } catch (err) {
      console.error('Google sign-in failed', err);
    }
  }, []);

  useEffect(() => {
    if (user || !GOOGLE_CLIENT_ID || rendered.current) return;

    const render = () => {
      const gsi = window.google?.accounts?.id;
      if (!gsi || !hostRef.current || rendered.current) return;
      try {
        gsi.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredential,
          auto_select: false,
          cancel_on_tap_outside: true,
          itp_support: true,
        });
        (gsi as unknown as {
          renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
        }).renderButton(hostRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'signin_with',
          logo_alignment: 'center',
          width,
        });
        rendered.current = true;
        setReady(true);
      } catch (err) {
        console.error('Google button render failed', err);
      }
    };

    const existing = document.getElementById('google-identity-script');
    if (existing) {
      if (window.google?.accounts?.id) render();
      else existing.addEventListener('load', render, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-identity-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = render;
    document.head.appendChild(script);
  }, [user, handleCredential, width]);

  if (user || !GOOGLE_CLIENT_ID) return null;

  return (
    <div
      ref={hostRef}
      className={className}
      style={{ minHeight: ready ? undefined : 0, colorScheme: 'light' }}
      aria-label="Sign in with Google"
    />
  );
};

export default GoogleSignInButton;
