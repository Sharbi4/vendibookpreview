// Analytics utility for tracking user interactions
// Can be extended to integrate with Google Analytics, Mixpanel, Segment, etc.

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

  // Google Analytics 4 (if gtag is available)
  if (typeof window !== 'undefined' && 'gtag' in window) {
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

export const trackListingViewed = (listingId: string, category?: string): void => {
  trackEvent({
    category: 'Conversion',
    action: 'listing_viewed',
    label: category,
    metadata: { listing_id: listingId },
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

// Generic analytics exports for other parts of the app
export { trackEvent };
export type { AnalyticsEvent };
