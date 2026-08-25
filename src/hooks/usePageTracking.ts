import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { hasAnalyticsConsent } from '@/lib/cookieConsent';

const GA_MEASUREMENT_ID = 'G-NNWR0V8SH2';

/**
 * Route-to-page-title mapping for Google Analytics.
 * Pages with their own <SEO> component will override this via document.title,
 * but this ensures every page has a meaningful title for GA tracking.
 */
const ROUTE_TITLES: Record<string, string> = {
  '/': 'Home',
  '/browse': 'Browse Listings',
  '/search': 'Search',
  '/auth': 'Sign In / Sign Up',
  '/activation': 'Account Activation',
  '/reset-password': 'Reset Password',
  '/dashboard': 'Dashboard',
  '/host/bookings': 'Host Bookings',
  '/host/listings': 'Host Listings',
  '/host/reporting': 'Host Reporting',
  '/list': 'List Your Asset',
  '/list/ai': 'AI Listing Creator',
  '/account': 'My Account',
  '/favorites': 'Favorites',
  '/privacy': 'Privacy Policy',
  '/terms': 'Terms of Service',
  '/insurance': 'Insurance',
  '/how-it-works': 'How It Works',
  '/how-it-works-host': 'How It Works for Hosts',
  '/how-it-works-seller': 'How It Works for Sellers',
  '/become-a-host': 'Become a Host',
  '/contact': 'Contact Us',
  '/verify-identity': 'Identity Verification',
  '/verification-complete': 'Verification Complete',
  '/payment-success': 'Payment Success',
  '/payment-cancelled': 'Payment Cancelled',
  '/messages': 'Messages',
  '/admin': 'Admin Dashboard',
  '/admin/metrics': 'Admin Metrics',
  '/admin/listings': 'Admin Listings',
  '/admin/risk': 'Admin Risk Management',
  '/admin/finance': 'Admin Finance',
  '/notification-preferences': 'Notification Preferences',
  '/help': 'Help Center',
  '/california-privacy': 'California Privacy Rights',
  '/tools': 'Vendor Tools',
  '/tools/pricepilot': 'PricePilot Tool',
  '/tools/permitpath': 'PermitPath Tool',
  '/tools/startup-guide': 'Startup Guide',
  '/tools/regulations-hub': 'Regulations Hub',
  '/listing-published': 'Listing Published',
  '/install': 'Install App',
  '/vendor-spaces': 'Vendor Spaces',
  '/vendor-lots': 'Vendor Lots',
  '/faq': 'FAQ',
  '/signage-request': 'Signage Request',
  '/unsubscribe': 'Unsubscribe',
  '/vendi-ai-suite': 'Host Operating System',
  '/sell-my-food-truck': 'Sell My Food Truck',
  '/rent-my-commercial-kitchen': 'Rent My Commercial Kitchen',
  '/enterprise-onboarding': 'Enterprise Onboarding',
  '/pricing-calculator': 'Pricing Calculator',
  '/kitchen-earnings-calculator': 'Kitchen Earnings Calculator',
  '/payments': 'Payments & Protection',
  '/start': 'Start Your Food Business',
  '/homepage2': 'Homepage V2',
  '/rentals': 'My Rentals',
  '/blog': 'Blog',
  '/cities': 'Cities',
  '/transactions': 'Transactions',
};

/**
 * Resolves a meaningful page title from the current pathname.
 * Handles dynamic routes like /listing/:id, /messages/:id, etc.
 */
const getPageTitle = (pathname: string): string => {
  // Exact match first
  if (ROUTE_TITLES[pathname]) {
    return ROUTE_TITLES[pathname];
  }

  // Dynamic route patterns
  if (pathname.startsWith('/listing/')) return 'Listing Detail';
  if (pathname.startsWith('/create-listing/')) return 'Edit Listing';
  if (pathname.startsWith('/messages/')) return 'Conversation';
  if (pathname.startsWith('/u/')) return 'User Profile';
  if (pathname.startsWith('/help/')) return 'Help Article';
  if (pathname.startsWith('/checkout/')) return 'Checkout';
  if (pathname.startsWith('/book/')) return 'Booking Checkout';
  if (pathname.startsWith('/order-tracking/')) return 'Order Tracking';
  if (pathname.startsWith('/listing-published/')) return 'Listing Published';
  if (pathname.startsWith('/blog/category/')) return 'Blog Category';
  if (pathname.startsWith('/blog/')) return 'Blog Post';
  if (pathname.startsWith('/rent/')) return 'Rent - Category & City';
  if (pathname.startsWith('/buy/')) return 'Buy - Category & City';
  if (pathname.startsWith('/share/listing/')) return 'Shared Listing';

  // City landing pages
  if (pathname.includes('/list-food-truck')) return 'List Food Truck - City';
  if (pathname.includes('/list-food-trailer')) return 'List Food Trailer - City';
  if (pathname.includes('/list-vendor-space')) return 'List Vendor Space - City';
  if (pathname.endsWith('/list')) return 'List - City';
  if (pathname.endsWith('/browse')) return 'Browse - City';

  // City dynamic page
  if (pathname.match(/^\/[a-z-]+$/)) return 'City Page';

  return 'Vendibook';
};

const DEFAULT_TITLE = 'Vendibook | Buy, Sell & Rent Food Trucks & Trailers';

/**
 * Waits for a route's own <SEO> component to set a real document title before
 * reporting to GA. Dynamic routes (listing detail, city pages) resolve their
 * title only after data loads, so a fixed short timeout used to report generic
 * fallbacks like "Listing Detail | Vendibook".
 */
const waitForSettledTitle = (timeoutMs: number): Promise<void> =>
  new Promise((resolve) => {
    const titleEl = document.querySelector('title');
    if (!titleEl) {
      resolve();
      return;
    }
    if (document.title && document.title !== DEFAULT_TITLE) {
      resolve();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      observer.disconnect();
      clearTimeout(timer);
      resolve();
    };
    const observer = new MutationObserver(() => {
      if (document.title && document.title !== DEFAULT_TITLE) finish();
    });
    observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
    const timer = setTimeout(finish, timeoutMs);
  });

/**
 * Hook to track page views with Google Analytics on route changes.
 * Sets document.title for pages that don't have their own <SEO> component,
 * then fires a GA pageview. Only fires when user has given analytics consent.
 */
export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Give the route's own <SEO> component (including async/dynamic titles)
      // a chance to land before we read or replace document.title.
      await waitForSettledTitle(2500);
      if (cancelled) return;

      // Only fall back for routes that never set their own title.
      if (!document.title || document.title === DEFAULT_TITLE) {
        document.title = `${getPageTitle(location.pathname)} | Vendibook`;
      }

      if (!hasAnalyticsConsent()) return;
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('config', GA_MEASUREMENT_ID, {
          page_path: location.pathname + location.search,
          page_title: document.title,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search]);
};

export default usePageTracking;
