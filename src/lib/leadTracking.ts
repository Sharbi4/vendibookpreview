/**
 * Centralized lead + funnel tracking.
 * Writes to public.analytics_events and to window.gtag (if loaded) so the
 * same event powers admin funnels and GA4.
 */
import { trackEventToDb } from '@/hooks/useAnalyticsEvents';

export type LeadEventName =
  | 'search_performed'
  | 'search_results_returned'
  | 'search_zero_results'
  | 'search_result_impression'
  | 'listing_card_click'
  | 'check_availability_click'
  | 'contact_host_click'
  | 'lead_form_started'
  | 'lead_form_field_blur'
  | 'lead_form_validation_error'
  | 'lead_form_abandoned'
  | 'lead_form_submitted'
  | 'booking_request_started'
  | 'booking_request_submitted'
  | 'host_listing_started'
  | 'host_listing_published'
  // Homepage funnel
  | 'homepage_primary_cta_click'
  | 'homepage_browse_click'
  | 'homepage_host_list_click'
  | 'homepage_search_submit'
  | 'homepage_listing_card_click'
  | 'homepage_concierge_click'
  | 'homepage_final_cta_click'
  | 'homepage_listing_row_view_more_click'
  | 'homepage_featured_view_all_click'
  | 'homepage_featured_card_click'
  | 'homepage_premium_discovery_click'
  | 'hero_panel_viewed'
  | 'hero_panel_swiped'
  | 'hero_search_clicked'
  | 'hero_browse_clicked'
  | 'hero_list_it_free_clicked'
  | 'hero_financing_clicked'
  | 'hero_host_tools_clicked'
  | 'hero_payments_clicked'
  | 'referral_card_clicked'
  | 'concierge_card_clicked'
  // Listing card overlay funnel
  | 'listing_start_purchase_click'
  | 'listing_check_dates_click'
  | 'listing_view_availability_click'
  | 'listing_overlay_view_full_listing'
  | 'purchase_request_started'
  | 'rental_dates_request_started'
  | 'overlay_dismissed'
  // Availability overlay funnel (booking-engine surface)
  | 'availability_overlay_opened'
  | 'availability_overlay_dismissed'
  | 'availability_overlay_view_full_listing'
  | 'availability_mode_changed'
  | 'availability_date_selected'
  | 'availability_time_slot_selected'
  | 'availability_time_range_selected'
  | 'availability_unavailable_conflict'
  // Storefront (/u/...) funnel
  | 'profile_storefront_view'
  | 'profile_listing_click'
  | 'profile_message_host_click'
  | 'profile_share_click'
  // Session linking
  | 'session_user_link'
  // How Vendibook Works videos
  | 'homepage_video_tile_viewed'
  | 'homepage_video_tile_clicked'
  | 'homepage_video_opened'
  | 'homepage_video_started'
  | 'homepage_video_25_percent'
  | 'homepage_video_50_percent'
  | 'homepage_video_75_percent'
  | 'homepage_video_completed'
  | 'homepage_video_scene_viewed'
  | 'homepage_video_scene_completed'
  | 'homepage_video_chapter_clicked'
  | 'homepage_video_watch_duration'
  | 'homepage_video_cta_clicked'
  | 'homepage_video_transcript_downloaded'
  | 'listing_explainer_opened'
  // Monetization / checkout funnel
  | 'upgrade_viewed'
  | 'upgrade_selected'
  | 'checkout_started'
  | 'checkout_completed'
  | 'checkout_abandoned'
  | 'checkout_cancelled'
  // Offers
  | 'offer_started'
  | 'offer_submitted'
  | 'offer_accepted'
  | 'offer_declined'
  // Protected sale
  | 'protected_purchase_started'
  | 'protected_purchase_completed'
  // Buyer services
  | 'financing_request_started'
  | 'financing_request_completed'
  | 'inspection_request_started'
  | 'inspection_request_completed'
  | 'transportation_request_started'
  | 'transportation_request_completed'
  // Permit path
  | 'permit_path_started'
  | 'permit_path_step_completed'
  | 'permit_path_completed'
  // Subscriptions
  | 'subscription_started'
  | 'subscription_cancelled'
  // Inquiries
  | 'inquiry_started'
  | 'inquiry_submitted'
  // Listing workflow
  | 'listing_step_completed'
  | 'listing_abandoned'
  // AI
  | 'ai_suggestion_viewed'
  | 'ai_suggestion_accepted'
  | 'ai_suggestion_rejected'
  | 'ai_feedback_submitted'
  | 'ai_copilot_opened'
  // Human escalation
  | 'human_support_requested'
  // Learn more overlay funnel
  | 'learn_more_opened'
  | 'learn_more_converted'
  // Tool preview / unlock ladder funnel
  | 'tool_preview_viewed'
  | 'tool_preview_converted'
  | 'unlock_ladder_option_selected'
  // Homepage videos (canonical funnel)
  | 'video_play'
  | 'video_view'
  | 'video_progress_25'
  | 'video_progress_50'
  | 'video_progress_75'
  | 'video_complete'
  | 'video_replay'
  // Equipment financing (Equinox)
  | 'financing_page_view'
  | 'financing_apply_click'
  | 'lead_captured'
  | 'seller_financing_enabled'
  | 'seller_financing_disabled';



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
  search_results_returned: 'discovery',
  search_zero_results: 'discovery',
  search_result_impression: 'discovery',
  listing_card_click: 'discovery',
  check_availability_click: 'booking',
  contact_host_click: 'booking',
  lead_form_started: 'lead',
  lead_form_field_blur: 'lead',
  lead_form_validation_error: 'lead',
  lead_form_abandoned: 'lead',
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
  homepage_listing_row_view_more_click: 'homepage',
  homepage_featured_view_all_click: 'homepage',
  homepage_featured_card_click: 'homepage',
  homepage_premium_discovery_click: 'homepage',
  hero_panel_viewed: 'homepage',
  hero_panel_swiped: 'homepage',
  hero_search_clicked: 'homepage',
  hero_browse_clicked: 'homepage',
  hero_list_it_free_clicked: 'homepage',
  hero_financing_clicked: 'homepage',
  hero_host_tools_clicked: 'homepage',
  hero_payments_clicked: 'homepage',
  referral_card_clicked: 'homepage',
  concierge_card_clicked: 'homepage',
  listing_start_purchase_click: 'discovery',
  listing_check_dates_click: 'discovery',
  listing_view_availability_click: 'discovery',
  listing_overlay_view_full_listing: 'discovery',
  purchase_request_started: 'lead',
  rental_dates_request_started: 'lead',
  overlay_dismissed: 'lead',
  availability_overlay_opened: 'booking',
  availability_overlay_dismissed: 'booking',
  availability_overlay_view_full_listing: 'booking',
  availability_mode_changed: 'booking',
  availability_date_selected: 'booking',
  availability_time_slot_selected: 'booking',
  availability_time_range_selected: 'booking',
  availability_unavailable_conflict: 'booking',
  profile_storefront_view: 'storefront',
  profile_listing_click: 'storefront',
  profile_message_host_click: 'storefront',
  profile_share_click: 'storefront',
  session_user_link: 'attribution',
  homepage_video_tile_viewed: 'homepage',
  homepage_video_tile_clicked: 'homepage',
  homepage_video_opened: 'homepage',
  homepage_video_started: 'homepage',
  homepage_video_25_percent: 'homepage',
  homepage_video_50_percent: 'homepage',
  homepage_video_75_percent: 'homepage',
  homepage_video_completed: 'homepage',
  homepage_video_scene_viewed: 'homepage',
  homepage_video_scene_completed: 'homepage',
  homepage_video_watch_duration: 'homepage',
  homepage_video_chapter_clicked: 'homepage',
  homepage_video_cta_clicked: 'homepage',
  listing_explainer_opened: 'discovery',
  homepage_video_transcript_downloaded: 'discovery',
  // Monetization
  upgrade_viewed: 'monetization',
  upgrade_selected: 'monetization',
  checkout_started: 'monetization',
  checkout_completed: 'monetization',
  checkout_abandoned: 'monetization',
  checkout_cancelled: 'monetization',
  // Offers
  offer_started: 'offer',
  offer_submitted: 'offer',
  offer_accepted: 'offer',
  offer_declined: 'offer',
  // Protected sale
  protected_purchase_started: 'transaction',
  protected_purchase_completed: 'transaction',
  // Buyer services
  financing_request_started: 'service',
  financing_request_completed: 'service',
  inspection_request_started: 'service',
  inspection_request_completed: 'service',
  transportation_request_started: 'service',
  transportation_request_completed: 'service',
  // Permit path
  permit_path_started: 'permit',
  permit_path_step_completed: 'permit',
  permit_path_completed: 'permit',
  // Subscriptions
  subscription_started: 'subscription',
  subscription_cancelled: 'subscription',
  // Inquiries
  inquiry_started: 'lead',
  inquiry_submitted: 'lead',
  // Listing workflow
  listing_step_completed: 'supply',
  listing_abandoned: 'supply',
  // AI
  ai_suggestion_viewed: 'ai',
  ai_suggestion_accepted: 'ai',
  ai_suggestion_rejected: 'ai',
  ai_feedback_submitted: 'ai',
  ai_copilot_opened: 'ai',
  // Human escalation
  human_support_requested: 'support',
  learn_more_opened: 'monetization',
  learn_more_converted: 'monetization',
  tool_preview_viewed: 'monetization',
  tool_preview_converted: 'monetization',
  unlock_ladder_option_selected: 'monetization',
  // Homepage videos
  video_play: 'homepage',
  video_view: 'homepage',
  video_progress_25: 'homepage',
  video_progress_50: 'homepage',
  video_progress_75: 'homepage',
  video_complete: 'homepage',
  video_replay: 'homepage',
  // Equipment financing (Equinox)
  financing_page_view: 'financing',
  financing_apply_click: 'financing',
  lead_captured: 'financing',
  seller_financing_enabled: 'financing',
  seller_financing_disabled: 'financing',
};


export const trackLeadEvent = (name: LeadEventName, payload: LeadEventPayload = {}) => {
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
