/**
 * Google Analytics 4 Conversion Tracking
 * Measurement ID: G-NNWR0V8SH2
 * 
 * These events are marked as conversions in GA4 and use the recommended
 * ecommerce event names for better integration with Google's reporting.
 */

import { hasAnalyticsConsent } from '@/lib/cookieConsent';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const GA4_MEASUREMENT_ID = 'G-NNWR0V8SH2';

/**
 * Helper to send GA4 events
 */
const sendGA4Event = (eventName: string, params?: Record<string, unknown>) => {
  if (!hasAnalyticsConsent()) return;
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, {
      send_to: GA4_MEASUREMENT_ID,
      ...params,
    });
  }
};

// ==================== CONVERSION EVENTS ====================

/**
 * Track user sign up (conversion)
 * Call when a user successfully creates an account
 */
export const trackGA4SignUp = (method: string = 'email') => {
  sendGA4Event('sign_up', {
    method,
  });
};

/**
 * Track user login
 * Call when a user successfully logs in
 */
export const trackGA4Login = (method: string = 'email') => {
  sendGA4Event('login', {
    method,
  });
};

/**
 * Track booking/purchase completion (conversion)
 * Call when a booking request is successfully submitted
 */
export const trackGA4Purchase = (params: {
  transaction_id: string;
  value: number;
  currency?: string;
  items: Array<{
    item_id: string;
    item_name: string;
    item_category?: string;
    price: number;
    quantity?: number;
  }>;
}) => {
  sendGA4Event('purchase', {
    transaction_id: params.transaction_id,
    value: params.value,
    currency: params.currency || 'USD',
    items: params.items,
  });
};

/**
 * Track booking request initiation (conversion)
 * Call when user starts the booking/checkout process
 */
export const trackGA4BeginCheckout = (params: {
  value: number;
  currency?: string;
  items: Array<{
    item_id: string;
    item_name: string;
    item_category?: string;
    price: number;
  }>;
}) => {
  sendGA4Event('begin_checkout', {
    value: params.value,
    currency: params.currency || 'USD',
    items: params.items,
  });
};

/**
 * Track lead generation (conversion)
 * Call when user submits an inquiry, contact form, or booking request
 */
export const trackGA4GenerateLead = (params?: {
  value?: number;
  currency?: string;
  lead_source?: string;
  form_name?: string;
  form_type?: string;
  [key: string]: unknown;
}) => {
  sendGA4Event('generate_lead', {
    value: params?.value,
    currency: params?.currency || 'USD',
    lead_source: params?.lead_source,
    form_name: params?.form_name,
    form_type: params?.form_type,
  });
};

// ==================== ECOMMERCE EVENTS ====================

/**
 * Track when a user views a listing (item)
 */
export const trackGA4ViewItem = (params: {
  item_id: string;
  item_name: string;
  item_category?: string;
  price?: number;
  currency?: string;
}) => {
  sendGA4Event('view_item', {
    currency: params.currency || 'USD',
    value: params.price,
    items: [{
      item_id: params.item_id,
      item_name: params.item_name,
      item_category: params.item_category,
      price: params.price,
    }],
  });
};

/**
 * Track when a user views listing search results
 */
export const trackGA4ViewItemList = (params: {
  item_list_id?: string;
  item_list_name?: string;
  items: Array<{
    item_id: string;
    item_name: string;
    item_category?: string;
    price?: number;
    index?: number;
  }>;
}) => {
  sendGA4Event('view_item_list', {
    item_list_id: params.item_list_id,
    item_list_name: params.item_list_name,
    items: params.items,
  });
};

/**
 * Track when a user clicks on a listing from a list
 */
export const trackGA4SelectItem = (params: {
  item_list_id?: string;
  item_list_name?: string;
  item_id: string;
  item_name: string;
  item_category?: string;
  price?: number;
  index?: number;
}) => {
  sendGA4Event('select_item', {
    item_list_id: params.item_list_id,
    item_list_name: params.item_list_name,
    items: [{
      item_id: params.item_id,
      item_name: params.item_name,
      item_category: params.item_category,
      price: params.price,
      index: params.index,
    }],
  });
};

/**
 * Track when a user adds a listing to favorites (wishlist)
 */
export const trackGA4AddToWishlist = (params: {
  item_id: string;
  item_name: string;
  item_category?: string;
  price?: number;
  currency?: string;
}) => {
  sendGA4Event('add_to_wishlist', {
    currency: params.currency || 'USD',
    value: params.price,
    items: [{
      item_id: params.item_id,
      item_name: params.item_name,
      item_category: params.item_category,
      price: params.price,
    }],
  });
};

// ==================== ENGAGEMENT EVENTS ====================

/**
 * Track search queries
 */
export const trackGA4Search = (searchTerm: string) => {
  sendGA4Event('search', {
    search_term: searchTerm,
  });
};

/**
 * Track content sharing
 */
export const trackGA4Share = (params: {
  method: string;
  content_type: string;
  item_id: string;
}) => {
  sendGA4Event('share', params);
};

/**
 * Track listing publication (for hosts)
 */
export const trackGA4ListingPublished = (params: {
  listing_id: string;
  listing_category: string;
  listing_mode: 'sale' | 'rent';
  listing_price?: number;
}) => {
  sendGA4Event('listing_published', {
    listing_id: params.listing_id,
    listing_category: params.listing_category,
    listing_mode: params.listing_mode,
    value: params.listing_price,
    currency: 'USD',
  });
};

/**
 * Track Stripe Connect completion (for hosts)
 */
export const trackGA4StripeConnected = () => {
  sendGA4Event('stripe_connected', {
    method: 'stripe_connect',
  });
};

/**
 * Track offer made (for sale listings)
 */
export const trackGA4OfferMade = (params: {
  listing_id: string;
  offer_amount: number;
  asking_price: number;
}) => {
  sendGA4Event('offer_made', {
    listing_id: params.listing_id,
    offer_amount: params.offer_amount,
    asking_price: params.asking_price,
    currency: 'USD',
  });
};

/**
 * Track newsletter signup
 */
export const trackGA4NewsletterSignup = (source?: string) => {
  sendGA4Event('newsletter_signup', {
    source: source || 'unknown',
  });
};

/**
 * Track availability alert signup
 */
export const trackGA4AlertSignup = (params?: {
  category?: string;
  location?: string;
}) => {
  sendGA4Event('alert_signup', {
    category: params?.category,
    location: params?.location,
  });
};
