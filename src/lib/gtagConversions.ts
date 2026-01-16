/**
 * Google Ads Conversion Tracking Utilities
 * Tag ID: AW-17121224552
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Track checkout conversion event
 * Call this when a user completes a checkout/payment
 */
export const trackCheckoutConversion = (params?: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'ads_conversion_Checkout_1', {
      send_to: 'AW-17121224552',
      ...params,
    });
  }
};

/**
 * Track shopping cart event
 * Call this when a user adds items to cart or views cart
 */
export const trackShoppingCartConversion = (params?: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'ads_conversion_Shopping_Cart_1', {
      send_to: 'AW-17121224552',
      ...params,
    });
  }
};

/**
 * Track form submission event
 * Call this when a user submits a form (contact, booking request, etc.)
 */
export const trackFormSubmitConversion = (params?: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'form_submit', {
      send_to: 'AW-17121224552',
      ...params,
    });
  }
};

/**
 * Track custom conversion event
 */
export const trackCustomConversion = (eventName: string, params?: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, {
      send_to: 'AW-17121224552',
      ...params,
    });
  }
};
