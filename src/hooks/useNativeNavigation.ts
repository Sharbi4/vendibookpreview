import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { parseAppLink } from '@/lib/native/links';

export function useNativeNavigation() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    let lastUrl = '';
    let lastAt = 0;
    let queue = Promise.resolve();
    const receive = (raw: string) => {
      const url = parseAppLink(raw);
      if (!url || disposed || (raw === lastUrl && Date.now() - lastAt < 3000)) return;
      lastUrl = raw; lastAt = Date.now();
      queue = queue.then(async () => {
        if (disposed) return;
        // The already-created Supabase client does not automatically consume a
        // new URL delivered by Android. Establish the session before routing.
        const hash = new URLSearchParams(url.hash.slice(1));
        const access = hash.get('access_token');
        const refresh = hash.get('refresh_token');
        const code = url.searchParams.get('code');
        if (access && refresh) {
          const { error } = await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
          if (error) throw error;
          url.hash = '';
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          url.searchParams.delete('code');
        }
        if (!disposed) navigate(url.pathname + url.search + url.hash);
      }).catch(() => {
        if (!disposed) toast.error('This sign-in link could not be completed. Please sign in again or request a new link.');
      });
    };
    const links = App.addListener('appUrlOpen', ({ url }) => receive(url));
    const back = App.addListener('backButton', ({ canGoBack }) => {
      // Give open dialogs their normal Escape dismissal before leaving a page.
      const dialog = document.querySelector('[role="dialog"], [role="alertdialog"]');
      if (dialog) {
        dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      } else if (canGoBack) window.history.back();
      else App.minimizeApp();
    });
    App.getLaunchUrl().then(result => { if (result?.url) receive(result.url); }).catch(() => {});
    return () => {
      disposed = true;
      void links.then(handle => handle.remove());
      void back.then(handle => handle.remove());
    };
  }, [navigate]);
}
