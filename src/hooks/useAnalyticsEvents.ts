import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsEvent {
  id: string;
  user_id: string | null;
  session_id: string | null;
  event_name: string;
  event_category: string | null;
  metadata: Record<string, unknown>;
  route: string | null;
  city: string | null;
  listing_id: string | null;
  created_at: string;
}

interface FunnelStep {
  name: string;
  count: number;
  conversionRate: number;
}

interface FunnelData {
  steps: FunnelStep[];
  dropOffStep: string | null;
  dropOffRate: number;
}

interface CityStats {
  city: string;
  activeListings: number;
  requests: number;
  medianResponseMs: number | null;
}

interface AlertItem {
  type: 'stale_drafts' | 'pending_requests' | 'low_quality_listings';
  count: number;
  severity: 'warning' | 'critical';
}

// Get or create session ID
const getSessionId = (): string => {
  if (typeof window === 'undefined') return 'ssr';
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

// Track event to database
export const trackEventToDb = async (
  eventName: string,
  eventCategory?: string,
  metadata?: Record<string, unknown>,
  listingId?: string,
  city?: string
): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const route = typeof window !== 'undefined' ? window.location.pathname : null;

    await (supabase.from('analytics_events') as any).insert({
      user_id: user?.id || null,
      session_id: getSessionId(),
      event_name: eventName,
      event_category: eventCategory || null,
      metadata: metadata || {},
      route,
      city: city || null,
      listing_id: listingId || null,
    });
  } catch (error) {
    console.error('[Analytics] Failed to track event:', error);
  }
};

// Admin hook for viewing funnel metrics
export const useAdminFunnelMetrics = (days: number = 7) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return useQuery({
    queryKey: ['admin-funnel-metrics', days],
    queryFn: async () => {
      // Supply funnel events
      const supplyEvents = [
        'supply_flow_started',
        'draft_created',
        'photos_added',
        'pricing_added',
        'stripe_connect_clicked',
        'stripe_connected',
        'listing_published'
      ];

      // Demand funnel events
      const demandEvents = [
        'search_started',
        'listing_viewed',
        'request_started',
        'request_submitted',
        'booking_confirmed'
      ];

      // Fetch all events in date range
      const { data: events, error } = await supabase
        .from('analytics_events')
        .select('event_name, created_at')
        .gte('created_at', startDate.toISOString())
        .in('event_name', [...supplyEvents, ...demandEvents]);

      if (error) throw error;

      // Count events
      const eventCounts: Record<string, number> = {};
      (events || []).forEach((e: { event_name: string }) => {
        eventCounts[e.event_name] = (eventCounts[e.event_name] || 0) + 1;
      });

      // Build supply funnel
      const buildFunnel = (eventList: string[]): FunnelData => {
        const steps: FunnelStep[] = [];
        let maxDropOff = 0;
        let dropOffStep: string | null = null;

        eventList.forEach((eventName, index) => {
          const count = eventCounts[eventName] || 0;
          const prevCount = index > 0 ? (steps[index - 1]?.count || 0) : count;
          const conversionRate = prevCount > 0 ? (count / prevCount) * 100 : 0;
          
          if (index > 0) {
            const dropOff = 100 - conversionRate;
            if (dropOff > maxDropOff && prevCount > 0) {
              maxDropOff = dropOff;
              dropOffStep = eventName;
            }
          }

          steps.push({
            name: eventName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            count,
            conversionRate: index === 0 ? 100 : conversionRate,
          });
        });

        return { steps, dropOffStep, dropOffRate: maxDropOff };
      };

      return {
        supplyFunnel: buildFunnel(supplyEvents),
        demandFunnel: buildFunnel(demandEvents),
        totalEvents: events?.length || 0,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Admin hook for city liquidity stats
export const useAdminCityStats = () => {
  const cities = ['Houston', 'Los Angeles', 'Dallas', 'Phoenix'];

  return useQuery({
    queryKey: ['admin-city-stats'],
    queryFn: async () => {
      const cityStats: CityStats[] = [];

      for (const city of cities) {
        // Get active listings count
        const { count: listingCount } = await supabase
          .from('listings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'published')
          .ilike('address', `%${city}%`);

        // Get requests count (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: requests } = await supabase
          .from('booking_requests')
          .select('id, listing_id')
          .gte('created_at', thirtyDaysAgo.toISOString());

        // Count requests for this city's listings
        let requestCount = 0;
        if (requests) {
          const { data: cityListings } = await supabase
            .from('listings')
            .select('id')
            .ilike('address', `%${city}%`);
          
          const cityListingIds = new Set((cityListings || []).map(l => l.id));
          requestCount = requests.filter(r => cityListingIds.has(r.listing_id)).length;
        }

        // Get median response time
        const { data: responseTimes } = await supabase
          .from('booking_requests')
          .select('created_at, responded_at')
          .not('responded_at', 'is', null)
          .gte('created_at', thirtyDaysAgo.toISOString());

        let medianResponseMs: number | null = null;
        if (responseTimes && responseTimes.length > 0) {
          const times = responseTimes
            .map(r => new Date(r.responded_at!).getTime() - new Date(r.created_at).getTime())
            .sort((a, b) => a - b);
          medianResponseMs = times[Math.floor(times.length / 2)];
        }

        cityStats.push({
          city,
          activeListings: listingCount || 0,
          requests: requestCount,
          medianResponseMs,
        });
      }

      return cityStats;
    },
    staleTime: 1000 * 60 * 5,
  });
};

// Admin hook for alerts/anomalies
export const useAdminAlerts = () => {
  return useQuery({
    queryKey: ['admin-alerts'],
    queryFn: async () => {
      const alerts: AlertItem[] = [];
      const now = new Date();

      // Stale drafts (older than 48h)
      const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      const { count: staleDrafts } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'draft')
        .lt('created_at', fortyEightHoursAgo.toISOString());

      if ((staleDrafts || 0) > 0) {
        alerts.push({
          type: 'stale_drafts',
          count: staleDrafts || 0,
          severity: staleDrafts! > 10 ? 'critical' : 'warning',
        });
      }

      // Pending requests > 2h
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const { count: pendingRequests } = await supabase
        .from('booking_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .lt('created_at', twoHoursAgo.toISOString())
        .is('responded_at', null);

      if ((pendingRequests || 0) > 0) {
        alerts.push({
          type: 'pending_requests',
          count: pendingRequests || 0,
          severity: 'critical',
        });
      }

      // Low quality listings (missing photos)
      const { count: lowQuality } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published')
        .or('image_urls.is.null,cover_image_url.is.null');

      if ((lowQuality || 0) > 0) {
        alerts.push({
          type: 'low_quality_listings',
          count: lowQuality || 0,
          severity: 'warning',
        });
      }

      return alerts;
    },
    staleTime: 1000 * 60 * 2,
  });
};

// Admin hook for risk flags
export const useAdminRiskFlags = () => {
  const queryClient = useQueryClient();

  const { data: flags = [], isLoading } = useQuery({
    queryKey: ['admin-risk-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('risk_flags')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const updateFlagMutation = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      resolution_notes 
    }: { 
      id: string; 
      status: string; 
      resolution_notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updates: Record<string, unknown> = { status };
      if (status === 'resolved' || status === 'dismissed') {
        updates.resolved_by = user?.id;
        updates.resolved_at = new Date().toISOString();
        updates.resolution_notes = resolution_notes || null;
      }

      const { error } = await supabase
        .from('risk_flags')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-risk-flags'] });
    },
  });

  const stats = {
    total: flags.length,
    open: flags.filter(f => f.status === 'open').length,
    investigating: flags.filter(f => f.status === 'investigating').length,
    critical: flags.filter(f => f.severity === 'critical' && f.status === 'open').length,
  };

  return {
    flags,
    isLoading,
    updateFlag: updateFlagMutation.mutate,
    isUpdating: updateFlagMutation.isPending,
    stats,
  };
};

// Admin hook for listings moderation
export const useAdminListingsModeration = () => {
  const queryClient = useQueryClient();

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['admin-listings-moderation'],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .or(`published_at.gte.${sevenDaysAgo.toISOString()},status.eq.published`)
        .order('published_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // Fetch host profiles separately
      const hostIds = [...new Set((data || []).map(l => l.host_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, identity_verified')
        .in('id', hostIds);
      
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      
      return (data || []).map(listing => ({
        ...listing,
        host: profileMap.get(listing.host_id) || null,
      }));
    },
  });

  const updateListingMutation = useMutation({
    mutationFn: async ({ 
      id, 
      status 
    }: { 
      id: string; 
      status: 'published' | 'paused' | 'draft';
    }) => {
      const { error } = await supabase
        .from('listings')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-listings-moderation'] });
    },
  });

  const stats = {
    total: listings.length,
    recentlyPublished: listings.filter((l: any) => {
      if (!l.published_at) return false;
      const pubDate = new Date(l.published_at);
      const dayAgo = new Date();
      dayAgo.setDate(dayAgo.getDate() - 1);
      return pubDate > dayAgo;
    }).length,
    unverifiedHosts: listings.filter((l: any) => !l.host?.identity_verified).length,
    missingPhotos: listings.filter((l: any) => !l.cover_image_url || !l.image_urls?.length).length,
  };

  return {
    listings,
    isLoading,
    updateListing: updateListingMutation.mutate,
    isUpdating: updateListingMutation.isPending,
    stats,
  };
};

// Hook for admin notes
export const useAdminNotes = (entityType: string, entityId: string) => {
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['admin-notes', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_notes')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('admin_notes')
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          note,
          created_by: user.id,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notes', entityType, entityId] });
    },
  });

  return {
    notes,
    isLoading,
    addNote: addNoteMutation.mutate,
    isAddingNote: addNoteMutation.isPending,
  };
};
