import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type DbListing = Tables<'listings'>;

interface HostProfile {
  full_name: string | null;
  avatar_url: string | null;
  identity_verified: boolean | null;
  created_at: string;
}

export const useListing = (listingId: string | undefined) => {
  const [listing, setListing] = useState<DbListing | null>(null);
  const [host, setHost] = useState<HostProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchListing = async () => {
      if (!listingId) {
        setError('Invalid listing ID');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data: listingData, error: listingError } = await supabase
          .from('listings')
          .select('*')
          .eq('id', listingId)
          .maybeSingle();

        if (listingError) throw listingError;
        
        if (listingData) {
          setListing(listingData);

          // Fetch host profile
          const { data: hostData, error: hostError } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, identity_verified, created_at')
            .eq('id', listingData.host_id)
            .maybeSingle();

          if (!hostError && hostData) {
            setHost(hostData);
          }
        } else {
          setError('Listing not found');
        }
      } catch (err) {
        console.error('Error fetching listing:', err);
        setError('Failed to load listing');
      } finally {
        setIsLoading(false);
      }
    };

    fetchListing();
  }, [listingId]);

  return { listing, host, isLoading, error };
};
