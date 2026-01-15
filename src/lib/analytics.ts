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

// Generic analytics exports for other parts of the app
export { trackEvent };
export type { AnalyticsEvent };
