import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SavedSearch {
  id: string;
  user_id: string;
  name?: string;
  category?: string;
  mode?: string;
  location_text?: string;
  latitude?: number;
  longitude?: number;
  radius_miles?: number;
  min_price?: number;
  max_price?: number;
  instant_book_only?: boolean;
  amenities?: string[];
  frequency?: 'instant' | 'daily' | 'weekly';
  last_notified_at?: string;
  created_at: string;
  updated_at: string;
}

interface CreateSavedSearchParams {
  name?: string;
  category?: string;
  mode?: string;
  location_text?: string;
  latitude?: number;
  longitude?: number;
  radius_miles?: number;
  min_price?: number;
  max_price?: number;
  instant_book_only?: boolean;
  amenities?: string[];
  frequency?: 'instant' | 'daily' | 'weekly';
}

export const useSavedSearches = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: savedSearches = [], isLoading } = useQuery({
    queryKey: ['saved-searches', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as SavedSearch[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (params: CreateSavedSearchParams) => {
      if (!user) throw new Error('Must be logged in');
      
      const { data, error } = await supabase
        .from('saved_searches')
        .insert({
          user_id: user.id,
          ...params,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
      toast.success('Search saved! We\'ll notify you of new matches.');
    },
    onError: () => {
      toast.error('Failed to save search');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
      toast.success('Saved search removed');
    },
    onError: () => {
      toast.error('Failed to remove saved search');
    },
  });

  const updateFrequencyMutation = useMutation({
    mutationFn: async ({ id, frequency }: { id: string; frequency: 'instant' | 'daily' | 'weekly' }) => {
      const { data, error } = await supabase
        .from('saved_searches')
        .update({ frequency, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
      toast.success('Alert frequency updated');
    },
    onError: () => {
      toast.error('Failed to update frequency');
    },
  });

  return {
    savedSearches,
    isLoading,
    saveSearch: createMutation.mutate,
    isSaving: createMutation.isPending,
    deleteSearch: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    updateFrequency: updateFrequencyMutation.mutate,
    isUpdating: updateFrequencyMutation.isPending,
  };
};

export default useSavedSearches;
