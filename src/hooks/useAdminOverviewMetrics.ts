import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface OverviewMetrics {
  sessions: number;
  signups: number;
  newListings: number;
  bookingRequests: number;
  paidBookings: number;
  gmv: number;
  netRevenue: number;
  // WoW changes (percentage)
  sessionsWoW: number | null;
  signupsWoW: number | null;
  newListingsWoW: number | null;
  bookingRequestsWoW: number | null;
}

interface FunnelStep {
  name: string;
  count: number;
  conversionRate: number;
}

interface UIFunnelData {
  steps: FunnelStep[];
  totalSessions: number;
}

interface SupplyHealthMetrics {
  totalDrafts: number;
  totalPublished: number;
  withPhotos6Plus: number;
  withPriceSet: number;
  withCalendarSet: number;
  withStripeComplete: number;
  verificationRate: number;
}

interface DemandHealthMetrics {
  searchesPerUser: number;
  listingViewsPerUser: number;
  messagesPerUser: number;
  requestsPerUser: number;
  repeatUsers7d: number;
  repeatUsers30d: number;
}

const calcWoW = (current: number, previous: number): number | null => {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
};

export const useAdminOverviewMetrics = (days: number = 7) => {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);
  const prevStart = new Date(startDate);
  prevStart.setDate(prevStart.getDate() - days);

  return useQuery({
    queryKey: ['admin-overview-metrics', days],
    queryFn: async (): Promise<OverviewMetrics> => {
      const currentStart = startDate.toISOString();
      const prevStartIso = prevStart.toISOString();

      // Sessions (unique session_ids in analytics_events)
      const { data: currentSessions } = await supabase
        .from('analytics_events')
        .select('session_id')
        .gte('created_at', currentStart)
        .not('session_id', 'is', null);
      
      const { data: prevSessions } = await supabase
        .from('analytics_events')
        .select('session_id')
        .gte('created_at', prevStartIso)
        .lt('created_at', currentStart)
        .not('session_id', 'is', null);

      const uniqueCurrent = new Set((currentSessions || []).map(e => e.session_id)).size;
      const uniquePrev = new Set((prevSessions || []).map(e => e.session_id)).size;

      // Signups (new profiles)
      const { count: signups } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', currentStart);

      const { count: prevSignups } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', prevStartIso)
        .lt('created_at', currentStart);

      // New listings (created)
      const { count: newListings } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', currentStart);

      const { count: prevListings } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', prevStartIso)
        .lt('created_at', currentStart);

      // Booking requests
      const { count: bookingRequests } = await supabase
        .from('booking_requests')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', currentStart);

      const { count: prevBookingRequests } = await supabase
        .from('booking_requests')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', prevStartIso)
        .lt('created_at', currentStart);

      // Paid bookings
      const { count: paidBookings } = await supabase
        .from('booking_requests')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', currentStart)
        .not('paid_at', 'is', null);

      // GMV (sum of total_price for paid bookings + sale_transactions)
      const { data: paidBookingAmounts } = await supabase
        .from('booking_requests')
        .select('total_price')
        .gte('created_at', currentStart)
        .not('paid_at', 'is', null);

      const { data: saleAmounts } = await supabase
        .from('sale_transactions')
        .select('amount, platform_fee')
        .gte('created_at', currentStart)
        .in('status', ['paid', 'confirmed', 'completed']);

      const bookingGMV = (paidBookingAmounts || []).reduce((sum, b) => sum + Number(b.total_price || 0), 0);
      const saleGMV = (saleAmounts || []).reduce((sum, s) => sum + Number(s.amount || 0), 0);
      const gmv = bookingGMV + saleGMV;

      // Net revenue (platform fees from sales + estimated 12.9% from bookings)
      const saleFees = (saleAmounts || []).reduce((sum, s) => sum + Number(s.platform_fee || 0), 0);
      const bookingFees = bookingGMV * 0.129;
      const netRevenue = saleFees + bookingFees;

      return {
        sessions: uniqueCurrent,
        signups: signups || 0,
        newListings: newListings || 0,
        bookingRequests: bookingRequests || 0,
        paidBookings: paidBookings || 0,
        gmv,
        netRevenue,
        sessionsWoW: calcWoW(uniqueCurrent, uniquePrev),
        signupsWoW: calcWoW(signups || 0, prevSignups || 0),
        newListingsWoW: calcWoW(newListings || 0, prevListings || 0),
        bookingRequestsWoW: calcWoW(bookingRequests || 0, prevBookingRequests || 0),
      };
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useUIFunnelMetrics = (days: number = 7) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return useQuery({
    queryKey: ['admin-ui-funnel', days],
    queryFn: async (): Promise<UIFunnelData> => {
      const start = startDate.toISOString();

      // Get all relevant funnel events
      const funnelEvents = [
        'search_submit', 'search_focus', 'search_started', 'search_performed',
        'listing_viewed', 'listing_card_click',
        'message_host_click', 'host_contacted',
        'request_started', 'request_submitted',
        'booking_checkout_started',
      ];

      const { data: events } = await supabase
        .from('analytics_events')
        .select('event_name, session_id')
        .gte('created_at', start)
        .in('event_name', funnelEvents);

      // Count unique sessions per event
      const eventSessionSets: Record<string, Set<string>> = {};
      (events || []).forEach(e => {
        if (!eventSessionSets[e.event_name]) eventSessionSets[e.event_name] = new Set();
        if (e.session_id) eventSessionSets[e.event_name].add(e.session_id);
      });

      // Total sessions
      const { data: allSessions } = await supabase
        .from('analytics_events')
        .select('session_id')
        .gte('created_at', start)
        .not('session_id', 'is', null);
      
      const totalSessions = new Set((allSessions || []).map(e => e.session_id)).size;

      // Also count listing_views from the dedicated table
      const { count: listingViews } = await supabase
        .from('listing_views')
        .select('*', { count: 'exact', head: true })
        .gte('viewed_at', start);

      // Count booking requests and messages from tables directly
      const { count: bookingRequestCount } = await supabase
        .from('booking_requests')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', start);

      const { count: messagesCount } = await supabase
        .from('conversation_messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', start);

      const { count: paidCount } = await supabase
        .from('booking_requests')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', start)
        .not('paid_at', 'is', null);

      // Build funnel steps
      const searchCount = (eventSessionSets['search_submit']?.size || 0) + 
                          (eventSessionSets['search_started']?.size || 0) +
                          (eventSessionSets['search_performed']?.size || 0);
      const uniqueSearchSessions = new Set([
        ...(eventSessionSets['search_submit'] || []),
        ...(eventSessionSets['search_started'] || []),
        ...(eventSessionSets['search_performed'] || []),
      ]).size;

      const viewCount = Math.max(listingViews || 0, eventSessionSets['listing_viewed']?.size || 0);
      const contactCount = (messagesCount || 0) + (bookingRequestCount || 0);
      const paymentCount = paidCount || 0;

      const steps: FunnelStep[] = [
        { name: 'Landing (Sessions)', count: totalSessions, conversionRate: 100 },
        { name: 'Search', count: uniqueSearchSessions, conversionRate: totalSessions > 0 ? (uniqueSearchSessions / totalSessions) * 100 : 0 },
        { name: 'Listing View', count: viewCount, conversionRate: uniqueSearchSessions > 0 ? (viewCount / uniqueSearchSessions) * 100 : 0 },
        { name: 'Message / Request', count: contactCount, conversionRate: viewCount > 0 ? (contactCount / viewCount) * 100 : 0 },
        { name: 'Payment', count: paymentCount, conversionRate: contactCount > 0 ? (paymentCount / contactCount) * 100 : 0 },
      ];

      return { steps, totalSessions };
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useSupplyHealthMetrics = () => {
  return useQuery({
    queryKey: ['admin-supply-health'],
    queryFn: async (): Promise<SupplyHealthMetrics> => {
      // Drafts vs Published
      const { count: totalDrafts } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'draft');

      const { count: totalPublished } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published');

      // Published listings with quality indicators
      const { data: publishedListings } = await supabase
        .from('listings')
        .select('id, image_urls, price_daily, price_weekly, price_monthly, price_hourly, price_sale, available_from, available_to, instant_book, host_id')
        .eq('status', 'published');

      const listings = publishedListings || [];
      const withPhotos6Plus = listings.filter(l => l.image_urls && l.image_urls.length >= 6).length;
      const withPriceSet = listings.filter(l => l.price_daily || l.price_weekly || l.price_monthly || l.price_hourly || l.price_sale).length;
      const withCalendarSet = listings.filter(l => l.available_from || l.available_to || l.instant_book).length;

      // Stripe completion
      const hostIds = [...new Set(listings.map(l => l.host_id).filter(Boolean))];
      let withStripeComplete = 0;
      if (hostIds.length > 0) {
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .in('id', hostIds)
          .eq('stripe_onboarding_complete', true);
        withStripeComplete = count || 0;
      }

      // Verification rate
      let verificationRate = 0;
      if (hostIds.length > 0) {
        const { count: verified } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .in('id', hostIds)
          .eq('identity_verified', true);
        verificationRate = hostIds.length > 0 ? ((verified || 0) / hostIds.length) * 100 : 0;
      }

      return {
        totalDrafts: totalDrafts || 0,
        totalPublished: totalPublished || 0,
        withPhotos6Plus,
        withPriceSet,
        withCalendarSet,
        withStripeComplete,
        verificationRate,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useDemandHealthMetrics = (days: number = 30) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return useQuery({
    queryKey: ['admin-demand-health', days],
    queryFn: async (): Promise<DemandHealthMetrics> => {
      const start = startDate.toISOString();

      // Total unique users in period
      const { data: activeUsers } = await supabase
        .from('analytics_events')
        .select('user_id')
        .gte('created_at', start)
        .not('user_id', 'is', null);

      const uniqueUsers = new Set((activeUsers || []).map(e => e.user_id)).size;

      // Searches
      const { count: searches } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', start)
        .in('event_name', ['search_submit', 'search_started', 'search_performed']);

      // Listing views
      const { count: views } = await supabase
        .from('listing_views')
        .select('*', { count: 'exact', head: true })
        .gte('viewed_at', start);

      // Messages
      const { count: messages } = await supabase
        .from('conversation_messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', start);

      // Requests
      const { count: requests } = await supabase
        .from('booking_requests')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', start);

      // Repeat users (users with sessions on multiple days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: repeat7d } = await supabase
        .from('analytics_events')
        .select('user_id, created_at')
        .gte('created_at', sevenDaysAgo.toISOString())
        .not('user_id', 'is', null);

      const userDays7 = new Map<string, Set<string>>();
      (repeat7d || []).forEach(e => {
        if (!e.user_id) return;
        if (!userDays7.has(e.user_id)) userDays7.set(e.user_id, new Set());
        userDays7.get(e.user_id)!.add(e.created_at.split('T')[0]);
      });
      const repeatUsers7d = [...userDays7.values()].filter(days => days.size > 1).length;

      const { data: repeat30d } = await supabase
        .from('analytics_events')
        .select('user_id, created_at')
        .gte('created_at', start)
        .not('user_id', 'is', null);

      const userDays30 = new Map<string, Set<string>>();
      (repeat30d || []).forEach(e => {
        if (!e.user_id) return;
        if (!userDays30.has(e.user_id)) userDays30.set(e.user_id, new Set());
        userDays30.get(e.user_id)!.add(e.created_at.split('T')[0]);
      });
      const repeatUsers30d = [...userDays30.values()].filter(days => days.size > 1).length;

      const safeDiv = (a: number, b: number) => b > 0 ? Math.round((a / b) * 10) / 10 : 0;

      return {
        searchesPerUser: safeDiv(searches || 0, uniqueUsers),
        listingViewsPerUser: safeDiv(views || 0, uniqueUsers),
        messagesPerUser: safeDiv(messages || 0, uniqueUsers),
        requestsPerUser: safeDiv(requests || 0, uniqueUsers),
        repeatUsers7d,
        repeatUsers30d,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useCTAClickMetrics = (days: number = 7) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return useQuery({
    queryKey: ['admin-cta-clicks', days],
    queryFn: async () => {
      const start = startDate.toISOString();

      const ctaEvents = [
        'hero_vendi_click',
        'voice_widget_open', 
        'search_submit',
        'search_focus',
        'hero_cta_click',
        'match_me_submit',
        'create_listing_click',
      ];

      const { data: events } = await supabase
        .from('analytics_events')
        .select('event_name')
        .gte('created_at', start)
        .in('event_name', ctaEvents);

      const counts: Record<string, number> = {};
      (events || []).forEach(e => {
        counts[e.event_name] = (counts[e.event_name] || 0) + 1;
      });

      return counts;
    },
    staleTime: 1000 * 60 * 5,
  });
};
