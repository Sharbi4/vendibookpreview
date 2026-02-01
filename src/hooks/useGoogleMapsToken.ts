import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to access the Google Maps API key.
 * 
 * Fetches the API key from Supabase Edge Function which has access to secrets.
 * The key should be restricted in Google Cloud Console to:
 * - Specific HTTP referrers (your domain)
 * - Specific APIs (Maps JavaScript API, Places API)
 */
export const useGoogleMapsToken = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        // First check if we have it in env (for local dev)
        const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (envKey && envKey !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
          setApiKey(envKey);
          setError(null);
          setIsLoading(false);
          return;
        }

        // Fetch from Supabase Edge Function (production - Lovable secrets)
        const { data, error: fetchError } = await supabase.functions.invoke('get-maps-api-key');
        
        if (fetchError) {
          throw fetchError;
        }
        
        if (data?.apiKey) {
          setApiKey(data.apiKey);
          setError(null);
        } else if (data?.error) {
          setError(data.error);
        } else {
          setError('Google Maps API key not configured');
        }
      } catch (err) {
        console.error('Error fetching Google Maps API key:', err);
        setError('Failed to load Google Maps');
      } finally {
        setIsLoading(false);
      }
    };

    fetchApiKey();
  }, []);

  return { apiKey, isLoading, error };
};
