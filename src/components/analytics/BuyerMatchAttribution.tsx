import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { hasAnalyticsConsent } from '@/lib/cookieConsent';

export default function BuyerMatchAttribution() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    const record = () => {
      if (!hasAnalyticsConsent()) return;
      const match = pathname.match(/^\/listing\/([a-f0-9-]{36})\/?$/i);
      const token = new URLSearchParams(search).get('ref');
      if (!match || !token || !/^bm_[a-f0-9]{64}$/.test(token)) return;
      try {
        let session = sessionStorage.getItem('vb_bm_session');
        if (!session) { session = crypto.randomUUID(); sessionStorage.setItem('vb_bm_session', session); }
        const key = `vb_bm_visit:${token}:${new Date().toISOString().slice(0,10)}`;
        if (sessionStorage.getItem(key)) return;
        const host = document.referrer ? new URL(document.referrer).hostname : null;
        void supabase.rpc('buyermatch_track_visit', { _token: token.slice(3), _listing_id: match[1], _session: session, _consent: true, _referrer_host: host ?? undefined }).then(({ data, error }) => { if (!error && data) sessionStorage.setItem(key, '1'); });
      } catch { /* Analytics must never affect listing access. */ }
    };
    record();
    window.addEventListener('cookieConsentUpdated', record);
    return () => window.removeEventListener('cookieConsentUpdated', record);
  }, [pathname, search]);
  return null;
}
