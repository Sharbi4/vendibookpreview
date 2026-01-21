/**
 * Google Ads Conversion Tracking Utilities
 * Tag ID: AW-17121224552
 * 
 * Also sends to GA4 Measurement ID: G-NNWR0V8SH2
 */

import { hasMarketingConsent, hasAnalyticsConsent } from '@/lib/cookieConsent';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const GOOGLE_ADS_ID = 'AW-17121224552';
const GA4_MEASUREMENT_ID = 'G-NNWR0V8SH2';

/**
 * Helper to send conversion events to both Google Ads and GA4
 */
const sendConversionEvent = (eventName: string, params?: Record<string, unknown>) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  // Send to Google Ads (requires marketing consent)
  if (hasMarketingConsent()) {
    window.gtag('event', eventName, {
      send_to: GOOGLE_ADS_ID,
      ...params,
    });
  }
  
  // Also send to GA4 (requires analytics consent)
  if (hasAnalyticsConsent()) {
    window.gtag('event', eventName, {
      send_to: GA4_MEASUREMENT_ID,
      ...params,
    });
  }
};

/**
 * Track checkout conversion event
 * Call this when a user completes a checkout/payment
 */
export const trackCheckoutConversion = (params?: {
  transaction_id?: string;
  value?: number;
  currency?: string;
}) => {
  sendConversionEvent('purchase', {
    transaction_id: params?.transaction_id,
    value: params?.value,
    currency: params?.currency || 'USD',
  });
};

/**
 * Track shopping cart event
 * Call this when a user adds items to cart or views cart
 */
export const trackShoppingCartConversion = (params?: {
  value?: number;
  currency?: string;
  items?: Array<{ item_id: string; item_name: string; price?: number }>;
}) => {
  sendConversionEvent('add_to_cart', params);
};

/**
 * Track form submission event
 * Call this when a user submits a form (contact, booking request, etc.)
 */
export const trackFormSubmitConversion = (params?: {
  form_name?: string;
  lead_source?: string;
  form_type?: string;
  [key: string]: unknown;
}) => {
  sendConversionEvent('generate_lead', params);
};

/**
 * Track host/supply signup conversion event
 * Call this when a host completes signup for listing their asset
 */
export const trackSignupConversion = (params?: {
  method?: string;
  user_type?: 'host' | 'shopper';
}) => {
  sendConversionEvent('sign_up', params);
};

/**
 * Track booking request submitted
 */
export const trackBookingConversion = (params?: {
  booking_id?: string;
  listing_id?: string;
  value?: number;
  is_instant_book?: boolean;
}) => {
  sendConversionEvent('begin_checkout', {
    transaction_id: params?.booking_id,
    value: params?.value,
    currency: 'USD',
    items: params?.listing_id ? [{ item_id: params.listing_id }] : undefined,
  });
};

/**
 * Track custom conversion event
 */
export const trackCustomConversion = (eventName: string, params?: Record<string, unknown>) => {
  sendConversionEvent(eventName, params);
};
