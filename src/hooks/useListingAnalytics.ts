import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ListingAnalytics {
  listingId: string;
  title: string;
  totalViews: number;
  viewsToday: number;
  viewsThisWeek: number;
  viewsThisMonth: number;
  viewsTrend: number; // percentage change from last period
}

interface HostAnalytics {
  totalViews: number;
  viewsToday: number;
  viewsThisWeek: number;
  viewsThisMonth: number;
  viewsTrend: number;
  topListings: ListingAnalytics[];
  dailyViews: { date: string; views: number }[];
}

export const useListingAnalytics = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<HostAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30).toISOString();
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 60).toISOString();

      // Get all host listings
      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select('id, title, view_count')
        .eq('host_id', user.id);

      if (listingsError) throw listingsError;

      if (!listings || listings.length === 0) {
        setAnalytics({
          totalViews: 0,
          viewsToday: 0,
          viewsThisWeek: 0,
          viewsThisMonth: 0,
          viewsTrend: 0,
          topListings: [],
          dailyViews: [],
        });
        setIsLoading(false);
        return;
      }

      const listingIds = listings.map(l => l.id);

      // Fetch views for different periods
      const [todayViews, weekViews, monthViews, lastMonthViews, dailyViewsData] = await Promise.all([
        supabase
          .from('listing_views')
          .select('listing_id', { count: 'exact' })
          .in('listing_id', listingIds)
          .gte('viewed_at', todayStart),
        supabase
          .from('listing_views')
          .select('listing_id', { count: 'exact' })
          .in('listing_id', listingIds)
          .gte('viewed_at', weekStart),
        supabase
          .from('listing_views')
          .select('listing_id', { count: 'exact' })
          .in('listing_id', listingIds)
          .gte('viewed_at', monthStart),
        supabase
          .from('listing_views')
          .select('listing_id', { count: 'exact' })
          .in('listing_id', listingIds)
          .gte('viewed_at', lastMonthStart)
          .lt('viewed_at', monthStart),
        supabase
          .from('listing_views')
          .select('listing_id, viewed_at')
          .in('listing_id', listingIds)
          .gte('viewed_at', monthStart)
          .order('viewed_at', { ascending: true }),
      ]);

      // Calculate trend
      const thisMonthCount = monthViews.count || 0;
      const lastMonthCount = lastMonthViews.count || 0;
      const trend = lastMonthCount > 0 
        ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100)
        : thisMonthCount > 0 ? 100 : 0;

      // Group daily views
      const dailyMap = new Map<string, number>();
      dailyViewsData.data?.forEach(view => {
        const date = new Date(view.viewed_at).toISOString().split('T')[0];
        dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
      });

      // Fill in missing days with 0
      const dailyViews: { date: string; views: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyViews.push({
          date: dateStr,
          views: dailyMap.get(dateStr) || 0,
        });
      }

      // Get per-listing analytics
      const listingAnalytics: ListingAnalytics[] = listings.map(listing => {
        const listingTodayViews = todayViews.data?.filter(v => v.listing_id === listing.id).length || 0;
        const listingWeekViews = weekViews.data?.filter(v => v.listing_id === listing.id).length || 0;
        const listingMonthViews = monthViews.data?.filter(v => v.listing_id === listing.id).length || 0;
        const listingLastMonthViews = lastMonthViews.data?.filter(v => v.listing_id === listing.id).length || 0;
        
        const listingTrend = listingLastMonthViews > 0
          ? Math.round(((listingMonthViews - listingLastMonthViews) / listingLastMonthViews) * 100)
          : listingMonthViews > 0 ? 100 : 0;

        return {
          listingId: listing.id,
          title: listing.title || 'Untitled',
          totalViews: listing.view_count || 0,
          viewsToday: listingTodayViews,
          viewsThisWeek: listingWeekViews,
          viewsThisMonth: listingMonthViews,
          viewsTrend: listingTrend,
        };
      }).sort((a, b) => b.totalViews - a.totalViews);

      setAnalytics({
        totalViews: listings.reduce((sum, l) => sum + (l.view_count || 0), 0),
        viewsToday: todayViews.count || 0,
        viewsThisWeek: weekViews.count || 0,
        viewsThisMonth: thisMonthCount,
        viewsTrend: trend,
        topListings: listingAnalytics.slice(0, 5),
        dailyViews,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { analytics, isLoading, refetch: fetchAnalytics };
};

// Hook to track a listing view
export const useTrackListingView = () => {
  const { user } = useAuth();

  const trackView = useCallback(async (listingId: string) => {
    try {
      // Generate or get session ID for anonymous tracking
      let sessionId = sessionStorage.getItem('view_session_id');
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem('view_session_id', sessionId);
      }

      // Check if already viewed in this session (debounce)
      const viewedKey = `viewed_${listingId}`;
      const lastViewed = sessionStorage.getItem(viewedKey);
      const now = Date.now();
      
      // Only track if not viewed in last 30 minutes
      if (lastViewed && now - parseInt(lastViewed) < 30 * 60 * 1000) {
        return;
      }

      await supabase.from('listing_views').insert({
        listing_id: listingId,
        viewer_id: user?.id || null,
        session_id: sessionId,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
      });

      sessionStorage.setItem(viewedKey, now.toString());
    } catch (error) {
      // Silently fail - don't interrupt user experience for analytics
      console.error('Failed to track view:', error);
    }
  }, [user]);

  return { trackView };
};
