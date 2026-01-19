import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { hasAnalyticsConsent } from '@/lib/cookieConsent';

const GA_MEASUREMENT_ID = 'G-NNWR0V8SH2';

/**
 * Hook to track page views with Google Analytics on route changes.
 * Only fires when user has given analytics consent.
 */
export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    // Only track if user has consented to analytics
    if (!hasAnalyticsConsent()) return;

    // Check if gtag is available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', GA_MEASUREMENT_ID, {
        page_path: location.pathname + location.search,
        page_title: document.title,
      });
    }
  }, [location.pathname, location.search]);
};

export default usePageTracking;
