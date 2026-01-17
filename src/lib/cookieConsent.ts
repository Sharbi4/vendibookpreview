// Cookie consent utility for managing tracking scripts

export interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

const defaultPreferences: CookiePreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
  functional: false,
};

export const getCookiePreferences = (): CookiePreferences | null => {
  const consent = localStorage.getItem('cookie-consent');
  if (!consent) return null;
  try {
    return JSON.parse(consent) as CookiePreferences;
  } catch {
    return null;
  }
};

export const hasAnalyticsConsent = (): boolean => {
  const prefs = getCookiePreferences();
  return prefs?.analytics ?? false;
};

export const hasMarketingConsent = (): boolean => {
  const prefs = getCookiePreferences();
  return prefs?.marketing ?? false;
};

export const hasFunctionalConsent = (): boolean => {
  const prefs = getCookiePreferences();
  return prefs?.functional ?? false;
};

// Load Google Analytics script dynamically
export const loadGoogleAnalytics = (): void => {
  if (document.getElementById('ga-script')) return;
  
  const script = document.createElement('script');
  script.id = 'ga-script';
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-NNWR0V8SH2';
  document.head.appendChild(script);

  script.onload = () => {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', 'G-NNWR0V8SH2');
  };
};

// Load Google Ads script dynamically
export const loadGoogleAds = (): void => {
  if (document.getElementById('gads-script')) return;
  if (!window.gtag) {
    // Wait for GA to load first, then configure ads
    const checkGtag = setInterval(() => {
      if (window.gtag) {
        clearInterval(checkGtag);
        window.gtag('config', 'AW-17121224552');
      }
    }, 100);
    
    // Timeout after 5 seconds
    setTimeout(() => clearInterval(checkGtag), 5000);
    return;
  }
  
  window.gtag('config', 'AW-17121224552');
};

// Initialize tracking based on user consent
export const initializeTrackingFromConsent = (): void => {
  const prefs = getCookiePreferences();
  if (!prefs) return;

  if (prefs.analytics) {
    loadGoogleAnalytics();
  }

  if (prefs.marketing) {
    loadGoogleAds();
  }
};

// Remove tracking scripts and reset gtag
export const removeTrackingScripts = (): void => {
  const gaScript = document.getElementById('ga-script');
  if (gaScript) gaScript.remove();
  
  const gadsScript = document.getElementById('gads-script');
  if (gadsScript) gadsScript.remove();
  
  // Clear gtag
  window.gtag = undefined;
  window.dataLayer = [];
};

// Type declarations
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: ((...args: unknown[]) => void) | undefined;
  }
}
