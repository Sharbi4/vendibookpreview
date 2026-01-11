import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  identity_verified: boolean | null;
  created_at: string;
}

export interface UserStats {
  totalListings: number;
  totalReviewsReceived: number;
  averageRating: number | null;
  totalReviewsGiven: number;
}

export const useUserProfile = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Get current user to determine if viewing own profile
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const isOwnProfile = currentUser?.id === userId;

      // Fetch profile - exclude email from public queries for privacy
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, identity_verified, created_at, email')
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      // Only expose email for user's own profile (privacy protection)
      return {
        id: data.id,
        full_name: data.full_name,
        avatar_url: data.avatar_url,
        identity_verified: data.identity_verified,
        created_at: data.created_at,
        email: isOwnProfile ? data.email : null,
      } as UserProfile;
    },
    enabled: !!userId,
  });
};

export const useUserStats = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['user-stats', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Get total listings
      const { count: listingsCount } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('host_id', userId)
        .eq('status', 'published');

      // Get reviews received (as host)
      const { data: reviewsReceived } = await supabase
        .from('reviews')
        .select('rating')
        .eq('host_id', userId);

      // Get reviews given (as reviewer)
      const { count: reviewsGivenCount } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('reviewer_id', userId);

      const averageRating = reviewsReceived && reviewsReceived.length > 0
        ? reviewsReceived.reduce((sum, r) => sum + r.rating, 0) / reviewsReceived.length
        : null;

      return {
        totalListings: listingsCount || 0,
        totalReviewsReceived: reviewsReceived?.length || 0,
        averageRating: averageRating ? Math.round(averageRating * 10) / 10 : null,
        totalReviewsGiven: reviewsGivenCount || 0,
      } as UserStats;
    },
    enabled: !!userId,
  });
};

export const useUserListings = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['user-listings', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('host_id', userId)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};

export const useUserReviewsReceived = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['user-reviews-received', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('host_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch reviewer names - only non-sensitive fields
      const reviewerIds = [...new Set(data.map(r => r.reviewer_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', reviewerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      // Fetch listing titles
      const listingIds = [...new Set(data.map(r => r.listing_id))];
      const { data: listings } = await supabase
        .from('listings')
        .select('id, title')
        .in('id', listingIds);

      const listingMap = new Map(listings?.map(l => [l.id, l.title]) || []);

      return data.map(review => ({
        ...review,
        reviewer_name: profileMap.get(review.reviewer_id) || 'Anonymous',
        listing_title: listingMap.get(review.listing_id) || 'Unknown Listing',
      }));
    },
    enabled: !!userId,
  });
};

export const useUserReviewsGiven = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['user-reviews-given', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('reviewer_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch listing titles and host names - only non-sensitive fields
      const listingIds = [...new Set(data.map(r => r.listing_id))];
      const { data: listings } = await supabase
        .from('listings')
        .select('id, title, host_id')
        .in('id', listingIds);

      const listingMap = new Map(listings?.map(l => [l.id, { title: l.title, host_id: l.host_id }]) || []);

      const hostIds = [...new Set(listings?.map(l => l.host_id) || [])];
      const { data: hosts } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', hostIds);

      const hostMap = new Map(hosts?.map(h => [h.id, h.full_name]) || []);

      return data.map(review => {
        const listing = listingMap.get(review.listing_id);
        return {
          ...review,
          listing_title: listing?.title || 'Unknown Listing',
          host_name: listing ? hostMap.get(listing.host_id) || 'Unknown Host' : 'Unknown Host',
        };
      });
    },
    enabled: !!userId,
  });
};