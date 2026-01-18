import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useFavorites = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's favorites
  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('favorites')
        .select('listing_id')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data.map(f => f.listing_id);
    },
    enabled: !!user,
  });

  // Add favorite
  const addFavorite = useMutation({
    mutationFn: async (listingId: string) => {
      if (!user) throw new Error('Must be logged in');
      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, listing_id: listingId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast.success('Added to favorites');
    },
    onError: () => {
      toast.error('Failed to add to favorites');
    },
  });

  // Remove favorite
  const removeFavorite = useMutation({
    mutationFn: async (listingId: string) => {
      if (!user) throw new Error('Must be logged in');
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('listing_id', listingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast.success('Removed from favorites');
    },
    onError: () => {
      toast.error('Failed to remove from favorites');
    },
  });

  const toggleFavorite = (listingId: string) => {
    if (favorites.includes(listingId)) {
      removeFavorite.mutate(listingId);
    } else {
      addFavorite.mutate(listingId);
    }
  };

  const isFavorite = (listingId: string) => favorites.includes(listingId);

  return {
    favorites,
    isLoading,
    toggleFavorite,
    isFavorite,
    isToggling: addFavorite.isPending || removeFavorite.isPending,
  };
};

// Hook to get favorite count for a listing (for hosts)
export const useListingFavoriteCount = (listingId: string) => {
  return useQuery({
    queryKey: ['listing-favorite-count', listingId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('listing_id', listingId);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!listingId,
  });
};

// Hook to get favorite counts for multiple listings (for host dashboard)
export const useHostListingFavoriteCounts = (listingIds: string[]) => {
  return useQuery({
    queryKey: ['host-listing-favorite-counts', listingIds],
    queryFn: async () => {
      if (listingIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from('favorites')
        .select('listing_id')
        .in('listing_id', listingIds);
      
      if (error) throw error;
      
      // Count favorites per listing
      const counts: Record<string, number> = {};
      listingIds.forEach(id => counts[id] = 0);
      data.forEach(f => {
        counts[f.listing_id] = (counts[f.listing_id] || 0) + 1;
      });
      
      return counts;
    },
    enabled: listingIds.length > 0,
  });
};
