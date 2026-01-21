import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Listing = Tables<'listings'>;

export const useHostListings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchListings = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('host_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your listings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [user]);

  const updateListingStatus = async (id: string, status: Listing['status']) => {
    try {
      const updates: Partial<Listing> = { status };
      if (status === 'published') {
        updates.published_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('listings')
        .update(updates)
        .eq('id', id)
        .eq('host_id', user?.id);

      if (error) throw error;

      setListings(prev => 
        prev.map(l => l.id === id ? { ...l, ...updates } : l)
      );

      toast({
        title: 'Success',
        description: `Listing ${status === 'published' ? 'published' : status === 'paused' ? 'paused' : 'updated'}`,
      });
    } catch (error) {
      console.error('Error updating listing:', error);
      toast({
        title: 'Error',
        description: 'Failed to update listing',
        variant: 'destructive',
      });
    }
  };

  const deleteListing = async (id: string) => {
    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', id)
        .eq('host_id', user?.id);

      if (error) throw error;

      setListings(prev => prev.filter(l => l.id !== id));

      toast({
        title: 'Deleted',
        description: 'Listing has been removed',
      });
    } catch (error) {
      console.error('Error deleting listing:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete listing',
        variant: 'destructive',
      });
    }
  };

  const updateListingPrice = (id: string, newPrice: number) => {
    setListings(prev => 
      prev.map(l => l.id === id ? { ...l, price_sale: newPrice } : l)
    );
  };

  const stats = {
    total: listings.length,
    published: listings.filter(l => l.status === 'published').length,
    drafts: listings.filter(l => l.status === 'draft').length,
    rentals: listings.filter(l => l.mode === 'rent').length,
    sales: listings.filter(l => l.mode === 'sale').length,
  };

  return {
    listings,
    isLoading,
    stats,
    refetch: fetchListings,
    pauseListing: (id: string) => updateListingStatus(id, 'paused'),
    publishListing: (id: string) => updateListingStatus(id, 'published'),
    deleteListing,
    updateListingPrice,
  };
};
