import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { triggerOrchestrator } from '@/lib/orchestrator';
import { broadcastListingChanged, invalidateListingQueries } from '@/lib/listings/liveSync';
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

  /**
   * Update status with optimistic snapshot/rollback.
   * If `preservePublishedAt` is true, we don't reset the published_at timestamp
   * (used when un-pausing, so featured/analytics windows stay intact).
   */
  const updateListingStatus = async (
    id: string,
    status: Listing['status'],
    opts: { preservePublishedAt?: boolean } = {},
  ) => {
    const snapshot = listings;
    const target = listings.find((l) => l.id === id);
    if (!target) return;

    const updates: Partial<Listing> = { status };
    if (status === 'published' && !opts.preservePublishedAt && !target.published_at) {
      updates.published_at = new Date().toISOString();
    }

    // Optimistic
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));

    try {
      const { error } = await supabase
        .from('listings')
        .update(updates)
        .eq('id', id)
        .eq('host_id', user?.id);

      if (error) throw error;

      if (status === 'published' && user?.id) {
        triggerOrchestrator({
          user_id: user.id,
          event_type: 'listing_published',
          entity_id: id,
          payload: { title: target.title, category: target.category, city: target.city },
        });
      }

      toast({
        title: 'Saved',
        description:
          status === 'published'
            ? opts.preservePublishedAt
              ? 'Listing resumed'
              : 'Listing published'
            : status === 'paused'
              ? 'Listing paused'
              : status === 'archived'
                ? 'Listing archived'
                : 'Listing updated',
      });
    } catch (error) {
      console.error('Error updating listing:', error);
      setListings(snapshot); // rollback
      toast({
        title: 'Error',
        description: 'Failed to update listing — changes reverted.',
        variant: 'destructive',
      });
    }
  };

  const deleteListing = async (id: string) => {
    const snapshot = listings;
    setListings((prev) => prev.filter((l) => l.id !== id));
    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', id)
        .eq('host_id', user?.id);

      if (error) throw error;

      toast({ title: 'Deleted', description: 'Listing has been removed' });
    } catch (error) {
      console.error('Error deleting listing:', error);
      setListings(snapshot); // rollback
      toast({
        title: 'Error',
        description: 'Failed to delete listing — restored.',
        variant: 'destructive',
      });
    }
  };

  const duplicateListing = async (id: string) => {
    if (!user?.id) return;
    try {
      const { data: original, error: fetchErr } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .eq('host_id', user.id)
        .single();
      if (fetchErr || !original) throw fetchErr || new Error('Not found');

      const clone: any = { ...original };
      delete clone.id;
      delete clone.created_at;
      delete clone.updated_at;
      delete clone.published_at;
      delete clone.featured_enabled;
      delete clone.featured_at;
      delete clone.featured_expires_at;
      delete clone.featured_source;
      delete clone.pending_featured_payment;
      delete clone.view_count;
      clone.status = 'draft';
      clone.title = `Copy of ${original.title}`.slice(0, 200);

      const { data: inserted, error: insErr } = await supabase
        .from('listings')
        .insert(clone)
        .select('*')
        .single();
      if (insErr) throw insErr;

      setListings((prev) => [inserted as Listing, ...prev]);
      toast({ title: 'Duplicated', description: 'A draft copy was created.' });
    } catch (error) {
      console.error('Error duplicating listing:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate listing',
        variant: 'destructive',
      });
    }
  };

  const updateListingPrice = (id: string, newPrice: number) => {
    setListings((prev) =>
      prev.map((l) => (l.id === id ? { ...l, price_sale: newPrice } : l)),
    );
  };

  const stats = {
    total: listings.length,
    published: listings.filter((l) => l.status === 'published').length,
    drafts: listings.filter((l) => l.status === 'draft').length,
    paused: listings.filter((l) => l.status === 'paused').length,
    archived: listings.filter((l) => l.status === 'archived').length,
    rentals: listings.filter((l) => l.mode === 'rent').length,
    sales: listings.filter((l) => l.mode === 'sale').length,
  };

  return {
    listings,
    isLoading,
    stats,
    refetch: fetchListings,
    pauseListing: (id: string) => updateListingStatus(id, 'paused'),
    publishListing: (id: string) => updateListingStatus(id, 'published'),
    unpauseListing: (id: string) =>
      updateListingStatus(id, 'published', { preservePublishedAt: true }),
    archiveListing: (id: string) => updateListingStatus(id, 'archived'),
    deleteListing,
    duplicateListing,
    updateListingPrice,
  };
};
