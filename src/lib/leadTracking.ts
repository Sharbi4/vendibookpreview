/**
 * Centralized lead + funnel tracking.
 * Writes to public.analytics_events and to window.gtag (if loaded) so the
 * same event powers admin funnels and GA4.
 *
 * Standardized events (do not rename without updating the admin dashboard):
 *   search_performed, listing_card_click, check_availability_click,
 *   contact_host_click, lead_form_started, lead_form_submitted,
 *   booking_request_started, booking_request_submitted,
 *   host_listing_started, host_listing_published
 */
import { trackEventToDb } from '@/hooks/useAnalyticsEvents';

export type LeadEventName =
  | 'search_performed'
  | 'listing_card_click'
  | 'check_availability_click'
  | 'contact_host_click'
  | 'lead_form_started'
  | 'lead_form_submitted'
  | 'booking_request_started'
  | 'booking_request_submitted'
  | 'host_listing_started'
  | 'host_listing_published'
  // Homepage funnel — operational, first-party, not GA-gated
  | 'homepage_primary_cta_click'
  | 'homepage_browse_click'
  | 'homepage_host_list_click'
  | 'homepage_search_submit'
  | 'homepage_listing_card_click'
  | 'homepage_concierge_click'
  | 'homepage_final_cta_click';

export interface LeadEventPayload {
  listing_id?: string;
  city?: string;
  category?: string;
  intent?: string;
  source?: string;
  [key: string]: unknown;
}

const EVENT_CATEGORY: Record<LeadEventName, string> = {
  search_performed: 'discovery',
  listing_card_click: 'discovery',
  check_availability_click: 'booking',
  contact_host_click: 'booking',
  lead_form_started: 'lead',
  lead_form_submitted: 'lead',
  booking_request_started: 'booking',
  booking_request_submitted: 'booking',
  host_listing_started: 'supply',
  host_listing_published: 'supply',
  homepage_primary_cta_click: 'homepage',
  homepage_browse_click: 'homepage',
  homepage_host_list_click: 'homepage',
  homepage_search_submit: 'homepage',
  homepage_listing_card_click: 'homepage',
  homepage_concierge_click: 'homepage',
  homepage_final_cta_click: 'homepage',
};

export const trackLeadEvent = (name: LeadEventName, payload: LeadEventPayload = {}) => {
  // Fire-and-forget — never block UI.
  void trackEventToDb(
    name,
    EVENT_CATEGORY[name],
    payload,
    payload.listing_id,
    payload.city,
  );

  if (typeof window !== 'undefined' && (window as any).gtag) {
    try {
      (window as any).gtag('event', name, payload);
    } catch {
      // ignore
    }
  }
};
