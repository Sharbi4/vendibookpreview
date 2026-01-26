import { supabase } from "@/integrations/supabase/client";

const PIXEL_ID = "1070006041675593";

// Get Facebook browser cookies for deduplication
const getFacebookCookies = () => {
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  return {
    fbc: cookies._fbc || null, // Click ID
    fbp: cookies._fbp || null, // Browser ID
  };
};

// Generate a unique event ID for deduplication between Pixel and CAPI
const generateEventId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

interface UserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  externalId?: string; // User ID from your system
}

interface CustomData {
  value?: number;
  currency?: string;
  contentName?: string;
  contentCategory?: string;
  contentIds?: string[];
  contentType?: string;
  contents?: Array<{ id: string; quantity: number; item_price?: number }>;
  numItems?: number;
  searchString?: string;
  status?: string;
}

interface TrackEventOptions {
  eventName: string;
  userData?: UserData;
  customData?: CustomData;
  eventId?: string;
}

// Send event to both Meta Pixel (client-side) and Conversions API (server-side)
export const trackFacebookEvent = async ({
  eventName,
  userData = {},
  customData = {},
  eventId,
}: TrackEventOptions): Promise<void> => {
  const eventIdToUse = eventId || generateEventId();
  const fbCookies = getFacebookCookies();
  const eventSourceUrl = window.location.href;

  // 1. Send to Meta Pixel (client-side) with event_id for deduplication
  if (typeof window !== 'undefined' && (window as any).fbq) {
    try {
      const pixelCustomData: Record<string, any> = {};
      
      if (customData.value) pixelCustomData.value = customData.value;
      if (customData.currency) pixelCustomData.currency = customData.currency;
      if (customData.contentName) pixelCustomData.content_name = customData.contentName;
      if (customData.contentCategory) pixelCustomData.content_category = customData.contentCategory;
      if (customData.contentIds) pixelCustomData.content_ids = customData.contentIds;
      if (customData.contentType) pixelCustomData.content_type = customData.contentType;
      if (customData.contents) pixelCustomData.contents = customData.contents;
      if (customData.numItems) pixelCustomData.num_items = customData.numItems;
      if (customData.searchString) pixelCustomData.search_string = customData.searchString;
      if (customData.status) pixelCustomData.status = customData.status;

      (window as any).fbq('track', eventName, pixelCustomData, { eventID: eventIdToUse });
      console.log(`[FB Pixel] Tracked: ${eventName}`, { eventId: eventIdToUse });
    } catch (error) {
      console.error('[FB Pixel] Error:', error);
    }
  }

  // 2. Send to Conversions API (server-side) via edge function
  try {
    const capiUserData: Record<string, string | undefined> = {
      email: userData.email,
      phone: userData.phone,
      first_name: userData.firstName,
      last_name: userData.lastName,
      city: userData.city,
      state: userData.state,
      zip: userData.zip,
      country: userData.country || 'US',
      external_id: userData.externalId,
      fbc: fbCookies.fbc || undefined,
      fbp: fbCookies.fbp || undefined,
    };

    // Remove undefined values
    Object.keys(capiUserData).forEach(key => {
      if (capiUserData[key] === undefined) {
        delete capiUserData[key];
      }
    });

    const capiCustomData: Record<string, any> = {};
    if (customData.value) capiCustomData.value = customData.value;
    if (customData.currency) capiCustomData.currency = customData.currency || 'USD';
    if (customData.contentName) capiCustomData.content_name = customData.contentName;
    if (customData.contentCategory) capiCustomData.content_category = customData.contentCategory;
    if (customData.contentIds) capiCustomData.content_ids = customData.contentIds;
    if (customData.contentType) capiCustomData.content_type = customData.contentType;
    if (customData.contents) capiCustomData.contents = customData.contents;
    if (customData.numItems) capiCustomData.num_items = customData.numItems;
    if (customData.searchString) capiCustomData.search_string = customData.searchString;
    if (customData.status) capiCustomData.status = customData.status;

    const response = await supabase.functions.invoke('facebook-conversions-api', {
      body: {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_source_url: eventSourceUrl,
        event_id: eventIdToUse,
        action_source: 'website',
        user_data: capiUserData,
        custom_data: capiCustomData,
      },
    });

    if (response.error) {
      console.error('[FB CAPI] Error:', response.error);
    } else {
      console.log(`[FB CAPI] Tracked: ${eventName}`, { 
        eventId: eventIdToUse,
        events_received: response.data?.events_received 
      });
    }
  } catch (error) {
    console.error('[FB CAPI] Error:', error);
  }
};

// Pre-built event helpers for common conversions

export const trackPurchase = (options: {
  value: number;
  currency?: string;
  contentIds: string[];
  contentName?: string;
  contentType?: string;
  userData?: UserData;
}) => trackFacebookEvent({
  eventName: 'Purchase',
  userData: options.userData,
  customData: {
    value: options.value,
    currency: options.currency || 'USD',
    contentIds: options.contentIds,
    contentName: options.contentName,
    contentType: options.contentType || 'product',
  },
});

export const trackInitiateCheckout = (options: {
  value?: number;
  currency?: string;
  contentIds: string[];
  contentName?: string;
  numItems?: number;
  userData?: UserData;
}) => trackFacebookEvent({
  eventName: 'InitiateCheckout',
  userData: options.userData,
  customData: {
    value: options.value,
    currency: options.currency || 'USD',
    contentIds: options.contentIds,
    contentName: options.contentName,
    numItems: options.numItems || 1,
  },
});

export const trackLead = (options: {
  contentName?: string;
  contentCategory?: string;
  value?: number;
  userData?: UserData;
}) => trackFacebookEvent({
  eventName: 'Lead',
  userData: options.userData,
  customData: {
    contentName: options.contentName,
    contentCategory: options.contentCategory,
    value: options.value,
    currency: 'USD',
  },
});

export const trackViewContent = (options: {
  contentIds: string[];
  contentName: string;
  contentCategory?: string;
  value?: number;
  currency?: string;
  userData?: UserData;
}) => trackFacebookEvent({
  eventName: 'ViewContent',
  userData: options.userData,
  customData: {
    contentIds: options.contentIds,
    contentName: options.contentName,
    contentCategory: options.contentCategory,
    value: options.value,
    currency: options.currency || 'USD',
    contentType: 'product',
  },
});

export const trackAddToWishlist = (options: {
  contentIds: string[];
  contentName: string;
  contentCategory?: string;
  value?: number;
  userData?: UserData;
}) => trackFacebookEvent({
  eventName: 'AddToWishlist',
  userData: options.userData,
  customData: {
    contentIds: options.contentIds,
    contentName: options.contentName,
    contentCategory: options.contentCategory,
    value: options.value,
    currency: 'USD',
    contentType: 'product',
  },
});

export const trackSearch = (options: {
  searchString: string;
  contentCategory?: string;
  userData?: UserData;
}) => trackFacebookEvent({
  eventName: 'Search',
  userData: options.userData,
  customData: {
    searchString: options.searchString,
    contentCategory: options.contentCategory,
  },
});

export const trackCompleteRegistration = (options: {
  contentName?: string;
  status?: string;
  userData?: UserData;
}) => trackFacebookEvent({
  eventName: 'CompleteRegistration',
  userData: options.userData,
  customData: {
    contentName: options.contentName,
    status: options.status || 'registered',
  },
});

export const trackContact = (options?: {
  userData?: UserData;
}) => trackFacebookEvent({
  eventName: 'Contact',
  userData: options?.userData,
});
