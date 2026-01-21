// Analytics utility for tracking user interactions
// Integrates with Google Analytics 4 and custom event tracking

import { hasAnalyticsConsent } from '@/lib/cookieConsent';
import { 
  trackGA4ViewItem, 
  trackGA4AddToWishlist, 
  trackGA4SelectItem, 
  trackGA4Search,
  trackGA4BeginCheckout,
  trackGA4GenerateLead
} from '@/lib/ga4Conversions';

type AnalyticsEvent = {
  category: string;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, unknown>;
};

type TrustTileEvent = {
  tileId: string;
  tileTitle: string;
};

type TrustModalEvent = TrustTileEvent & {
  ctaType?: 'primary' | 'secondary';
  ctaLabel?: string;
};

// Generic event tracker - extend this to send to your analytics provider
const trackEvent = (event: AnalyticsEvent): void => {
  // Log to console in development
  if (import.meta.env.DEV) {
    console.log('[Analytics]', event);
  }

  // Only track if user has given analytics consent
  if (!hasAnalyticsConsent()) {
    return;
  }

  // Google Analytics 4 (if gtag is available)
  if (typeof window !== 'undefined' && 'gtag' in window && window.gtag) {
    (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', event.action, {
      event_category: event.category,
      event_label: event.label,
      value: event.value,
      ...event.metadata,
    });
  }

  // Add other analytics providers here:
  // - Mixpanel: mixpanel.track(event.action, { ...event })
  // - Segment: analytics.track(event.action, { ...event })
  // - PostHog: posthog.capture(event.action, { ...event })
};

// Trust & Safety specific tracking functions
export const trackTrustSectionImpression = (): void => {
  trackEvent({
    category: 'Trust & Safety',
    action: 'section_impression',
    label: 'Trust section viewed',
  });
};

export const trackTileClick = ({ tileId, tileTitle }: TrustTileEvent): void => {
  trackEvent({
    category: 'Trust & Safety',
    action: 'tile_click',
    label: tileTitle,
    metadata: { tile_id: tileId },
  });
};

export const trackModalOpen = ({ tileId, tileTitle }: TrustModalEvent): void => {
  trackEvent({
    category: 'Trust & Safety',
    action: 'modal_open',
    label: tileTitle,
    metadata: { tile_id: tileId },
  });
};

export const trackModalClose = ({ tileId, tileTitle }: TrustModalEvent): void => {
  trackEvent({
    category: 'Trust & Safety',
    action: 'modal_close',
    label: tileTitle,
    metadata: { tile_id: tileId },
  });
};

export const trackModalCtaClick = ({ tileId, tileTitle, ctaType, ctaLabel }: TrustModalEvent): void => {
  trackEvent({
    category: 'Trust & Safety',
    action: 'cta_click',
    label: `${tileTitle} - ${ctaLabel}`,
    metadata: { 
      tile_id: tileId, 
      cta_type: ctaType,
      cta_label: ctaLabel,
    },
  });
};

export const trackFaqExpand = ({ tileId, tileTitle, question }: TrustTileEvent & { question: string }): void => {
  trackEvent({
    category: 'Trust & Safety',
    action: 'faq_expand',
    label: question,
    metadata: { tile_id: tileId, tile_title: tileTitle },
  });
};

// Activation & Conversion funnel events
export const trackSignupCompleted = (role?: string): void => {
  trackEvent({
    category: 'Activation',
    action: 'signup_completed',
    label: role || 'unknown',
  });
};

export const trackChoosePathShown = (): void => {
  trackEvent({
    category: 'Activation',
    action: 'choose_path_shown',
  });
};

export const trackPathSelected = (path: 'demand' | 'supply'): void => {
  trackEvent({
    category: 'Activation',
    action: 'path_selected',
    label: path,
  });
};

export const trackActivationScreenViewed = (role: 'demand' | 'supply'): void => {
  trackEvent({
    category: 'Activation',
    action: 'activation_screen_viewed',
    label: role,
  });
};

export const trackSearchStarted = (location?: string): void => {
  trackEvent({
    category: 'Conversion',
    action: 'search_started',
    label: location || 'no_location',
  });
};

export const trackListingViewed = (listingId: string, category?: string, title?: string, price?: number): void => {
  trackEvent({
    category: 'Conversion',
    action: 'listing_viewed',
    label: category,
    metadata: { listing_id: listingId },
  });
  
  // Also fire GA4 view_item event
  trackGA4ViewItem({
    item_id: listingId,
    item_name: title || 'Listing',
    item_category: category,
    price: price,
  });
};

export const trackRequestStarted = (listingId: string): void => {
  trackEvent({
    category: 'Conversion',
    action: 'request_started',
    metadata: { listing_id: listingId },
  });
};

export const trackRequestSubmitted = (listingId: string, isInstantBook?: boolean): void => {
  trackEvent({
    category: 'Conversion',
    action: 'request_submitted',
    metadata: { listing_id: listingId, instant_book: isInstantBook },
  });
};

export const trackDraftCreated = (category?: string): void => {
  trackEvent({
    category: 'Supply',
    action: 'draft_created',
    label: category,
  });
};

export const trackListingPublished = (listingId: string): void => {
  trackEvent({
    category: 'Supply',
    action: 'listing_published',
    metadata: { listing_id: listingId },
  });
};

export const trackStripeConnected = (): void => {
  trackEvent({
    category: 'Supply',
    action: 'stripe_connected',
  });
};

export const trackAlertsEnabled = (category?: string, zipCode?: string): void => {
  trackEvent({
    category: 'Activation',
    action: 'alerts_enabled',
    label: category || 'all',
    metadata: { zip_code: zipCode },
  });
};

// City landing page events
export const trackCityListModuleViewed = (): void => {
  trackEvent({
    category: 'Supply',
    action: 'city_list_module_viewed',
  });
};

export const trackCityListClicked = (city: string): void => {
  trackEvent({
    category: 'Supply',
    action: `city_list_clicked_${city}`,
    label: city,
  });
};

// Import listing flow events
export const trackImportFlowStarted = (): void => {
  trackEvent({
    category: 'Supply',
    action: 'import_flow_started',
  });
};

export const trackImportMethodSelected = (method: string): void => {
  trackEvent({
    category: 'Supply',
    action: 'import_method_selected',
    label: method,
  });
};

export const trackImportContentSubmitted = (): void => {
  trackEvent({
    category: 'Supply',
    action: 'import_content_submitted',
  });
};

export const trackImportReviewViewed = (): void => {
  trackEvent({
    category: 'Supply',
    action: 'import_review_viewed',
  });
};

export const trackDraftCreatedFromImport = (importSource: string): void => {
  trackEvent({
    category: 'Supply',
    action: 'draft_created',
    label: 'import',
    metadata: { import_source: importSource },
  });
};

export const trackImportContinueSetupClicked = (): void => {
  trackEvent({
    category: 'Supply',
    action: 'import_continue_setup_clicked',
  });
};

export const trackImportFinishLaterClicked = (): void => {
  trackEvent({
    category: 'Supply',
    action: 'import_finish_later_clicked',
  });
};

// Share Kit events
export const trackShareKitViewed = (): void => {
  trackEvent({
    category: 'Supply',
    action: 'share_kit_viewed',
  });
};

export const trackShareLinkCopied = (): void => {
  trackEvent({
    category: 'Supply',
    action: 'share_link_copied',
  });
};

export const trackShareFbTextCopied = (): void => {
  trackEvent({
    category: 'Supply',
    action: 'share_fb_text_copied',
  });
};

export const trackShareQrDownloaded = (): void => {
  trackEvent({
    category: 'Supply',
    action: 'share_qr_downloaded',
  });
};

export const trackShareImageDownloaded = (): void => {
  trackEvent({
    category: 'Supply',
    action: 'share_image_downloaded',
  });
};

export const trackShareKitDismissed = (): void => {
  trackEvent({
    category: 'Supply',
    action: 'share_kit_dismissed',
  });
};

// Asset Request events
export const trackAssetRequestOpened = (): void => {
  trackEvent({
    category: 'Conversion',
    action: 'asset_request_opened',
  });
};

export const trackAssetRequestSubmitted = (assetType: string, city: string): void => {
  trackEvent({
    category: 'Conversion',
    action: 'asset_request_submitted',
    label: assetType,
    metadata: { city },
  });
};

// Saved Search events
export const trackSearchSaved = (category?: string, location?: string): void => {
  trackEvent({
    category: 'Search',
    action: 'search_saved',
    label: category || 'all',
    metadata: { location },
  });
};

// Badge interaction events
export const trackBadgeClicked = (badgeType: string): void => {
  trackEvent({
    category: 'Trust',
    action: 'badge_clicked',
    label: badgeType,
  });
};

// Listing Quality events
export const trackQualityCheckViewed = (photoCount: number, hasTitle: boolean, hasPrice: boolean, hasLocation: boolean): void => {
  trackEvent({
    category: 'Supply',
    action: 'quality_check_viewed',
    metadata: { photoCount, hasTitle, hasPrice, hasLocation },
  });
};

export const trackQualityCheckPassed = (): void => {
  trackEvent({
    category: 'Supply',
    action: 'quality_check_passed',
  });
};

// Cancellation Policy events
export const trackCancellationPolicyViewed = (isRental: boolean): void => {
  trackEvent({
    category: 'Trust',
    action: 'cancellation_policy_viewed',
    label: isRental ? 'rental' : 'sale',
  });
};

// Compact Trust Section events
export const trackCompactTrustOpened = (itemId: string): void => {
  trackEvent({
    category: 'Trust',
    action: 'compact_trust_opened',
    label: itemId,
  });
};

// Activation events
export const trackActivationRouted = (path: 'supply' | 'demand'): void => {
  trackEvent({
    category: 'Activation',
    action: 'activation_routed',
    label: path,
  });
};

// Cities page events
export const trackCitiesPageViewed = (): void => {
  trackEvent({
    category: 'Discovery',
    action: 'cities_page_viewed',
  });
};

export const trackCityCardBrowseClicked = (city: string): void => {
  trackEvent({
    category: 'Discovery',
    action: 'city_card_browse_clicked',
    label: city,
  });
};

export const trackCityCardListClicked = (city: string): void => {
  trackEvent({
    category: 'Discovery',
    action: 'city_card_list_clicked',
    label: city,
  });
};

export const trackFooterCitiesClicked = (): void => {
  trackEvent({
    category: 'Discovery',
    action: 'footer_cities_clicked',
  });
};

// ========== Button Click Events ==========
export const trackButtonClick = (buttonName: string, location: string, metadata?: Record<string, unknown>): void => {
  trackEvent({
    category: 'Engagement',
    action: 'button_click',
    label: buttonName,
    metadata: { location, ...metadata },
  });
};

export const trackCTAClick = (ctaName: string, location: string): void => {
  trackEvent({
    category: 'Conversion',
    action: 'cta_click',
    label: ctaName,
    metadata: { location },
  });
};

export const trackHeroCTAClick = (ctaType: 'browse' | 'list'): void => {
  trackEvent({
    category: 'Conversion',
    action: 'hero_cta_click',
    label: ctaType,
  });
};

// ========== Navigation Events ==========
export const trackNavigationClick = (destination: string, source: string): void => {
  trackEvent({
    category: 'Navigation',
    action: 'nav_click',
    label: destination,
    metadata: { source },
  });
};

export const trackFooterLinkClick = (linkName: string): void => {
  trackEvent({
    category: 'Navigation',
    action: 'footer_link_click',
    label: linkName,
  });
};

// ========== Form Events ==========
export const trackFormStart = (formName: string): void => {
  trackEvent({
    category: 'Forms',
    action: 'form_start',
    label: formName,
  });
};

export const trackFormSubmit = (formName: string, success: boolean, metadata?: Record<string, unknown>): void => {
  trackEvent({
    category: 'Forms',
    action: success ? 'form_submit_success' : 'form_submit_error',
    label: formName,
    metadata,
  });
};

export const trackFormFieldFocus = (formName: string, fieldName: string): void => {
  trackEvent({
    category: 'Forms',
    action: 'field_focus',
    label: `${formName}_${fieldName}`,
  });
};

export const trackFormError = (formName: string, errorField: string, errorMessage: string): void => {
  trackEvent({
    category: 'Forms',
    action: 'form_error',
    label: formName,
    metadata: { field: errorField, error: errorMessage },
  });
};

// ========== Auth Events ==========
export const trackLoginAttempt = (method: string): void => {
  trackEvent({
    category: 'Auth',
    action: 'login_attempt',
    label: method,
  });
};

export const trackLoginSuccess = (method: string): void => {
  trackEvent({
    category: 'Auth',
    action: 'login_success',
    label: method,
  });
};

export const trackLoginError = (method: string, errorType: string): void => {
  trackEvent({
    category: 'Auth',
    action: 'login_error',
    label: method,
    metadata: { error_type: errorType },
  });
};

export const trackSignupAttempt = (role: string): void => {
  trackEvent({
    category: 'Auth',
    action: 'signup_attempt',
    label: role,
  });
};

export const trackSignupError = (role: string, errorType: string): void => {
  trackEvent({
    category: 'Auth',
    action: 'signup_error',
    label: role,
    metadata: { error_type: errorType },
  });
};

export const trackPasswordResetRequest = (): void => {
  trackEvent({
    category: 'Auth',
    action: 'password_reset_request',
  });
};

export const trackLogout = (): void => {
  trackEvent({
    category: 'Auth',
    action: 'logout',
  });
};

// ========== Listing Interaction Events ==========
export const trackListingCardClick = (listingId: string, category: string, source: string): void => {
  trackEvent({
    category: 'Discovery',
    action: 'listing_card_click',
    label: category,
    metadata: { listing_id: listingId, source },
  });
};

export const trackListingFavorited = (listingId: string, category: string): void => {
  trackEvent({
    category: 'Engagement',
    action: 'listing_favorited',
    label: category,
    metadata: { listing_id: listingId },
  });
};

export const trackListingUnfavorited = (listingId: string): void => {
  trackEvent({
    category: 'Engagement',
    action: 'listing_unfavorited',
    metadata: { listing_id: listingId },
  });
};

export const trackListingShare = (listingId: string, method: string): void => {
  trackEvent({
    category: 'Engagement',
    action: 'listing_share',
    label: method,
    metadata: { listing_id: listingId },
  });
};

export const trackPhotoGalleryOpen = (listingId: string): void => {
  trackEvent({
    category: 'Engagement',
    action: 'photo_gallery_open',
    metadata: { listing_id: listingId },
  });
};

export const trackPhotoGalleryNavigation = (listingId: string, direction: 'next' | 'prev'): void => {
  trackEvent({
    category: 'Engagement',
    action: 'photo_gallery_nav',
    label: direction,
    metadata: { listing_id: listingId },
  });
};

// ========== Booking Events ==========
export const trackBookingFormOpen = (listingId: string, isInstantBook: boolean): void => {
  trackEvent({
    category: 'Conversion',
    action: 'booking_form_open',
    metadata: { listing_id: listingId, instant_book: isInstantBook },
  });
};

export const trackBookingDateSelected = (listingId: string, dateType: 'start' | 'end'): void => {
  trackEvent({
    category: 'Conversion',
    action: 'booking_date_selected',
    label: dateType,
    metadata: { listing_id: listingId },
  });
};

export const trackBookingCheckoutStarted = (listingId: string, totalPrice: number): void => {
  trackEvent({
    category: 'Conversion',
    action: 'booking_checkout_started',
    value: totalPrice,
    metadata: { listing_id: listingId },
  });
};

// ========== Search Events ==========
export const trackSearchPerformed = (query: string, filters: Record<string, unknown>, resultCount: number): void => {
  trackEvent({
    category: 'Search',
    action: 'search_performed',
    label: query || 'no_query',
    value: resultCount,
    metadata: filters,
  });
};

export const trackSearchFilterApplied = (filterType: string, filterValue: string): void => {
  trackEvent({
    category: 'Search',
    action: 'filter_applied',
    label: filterType,
    metadata: { value: filterValue },
  });
};

export const trackSearchNoResults = (query: string, filters: Record<string, unknown>): void => {
  trackEvent({
    category: 'Search',
    action: 'no_results',
    label: query || 'no_query',
    metadata: filters,
  });
};

// ========== Message Events ==========
export const trackMessageSent = (conversationType: 'booking' | 'inquiry'): void => {
  trackEvent({
    category: 'Engagement',
    action: 'message_sent',
    label: conversationType,
  });
};

export const trackHostContacted = (listingId: string): void => {
  trackEvent({
    category: 'Conversion',
    action: 'host_contacted',
    metadata: { listing_id: listingId },
  });
};

// ========== Error Tracking ==========
export const trackError = (errorType: string, errorMessage: string, context?: Record<string, unknown>): void => {
  trackEvent({
    category: 'Error',
    action: 'error_occurred',
    label: errorType,
    metadata: { message: errorMessage, ...context },
  });
};

// ========== Scroll/Visibility Events ==========
export const trackSectionViewed = (sectionName: string): void => {
  trackEvent({
    category: 'Engagement',
    action: 'section_viewed',
    label: sectionName,
  });
};

export const trackScrollDepth = (depth: 25 | 50 | 75 | 100): void => {
  trackEvent({
    category: 'Engagement',
    action: 'scroll_depth',
    value: depth,
  });
};

// Generic analytics exports for other parts of the app
export { trackEvent };
export type { AnalyticsEvent };
