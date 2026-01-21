import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type DbListing = Tables<'listings'>;

interface HostProfile {
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  identity_verified: boolean | null;
  created_at: string;
  display_name?: string | null;
  business_name?: string | null;
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

          // Fetch host profile using the RPC function for public access
          if (listingData.host_id) {
            const { data: hostData, error: hostError } = await supabase
              .rpc('get_safe_host_profile', { host_user_id: listingData.host_id });

            if (!hostError && hostData && hostData.length > 0) {
              const profile = hostData[0];
              setHost({
                full_name: profile.full_name,
                first_name: profile.first_name,
                last_name: profile.last_name,
                avatar_url: profile.avatar_url,
                identity_verified: profile.identity_verified,
                created_at: profile.created_at,
                display_name: profile.display_name,
                business_name: profile.business_name,
              });
            }
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
