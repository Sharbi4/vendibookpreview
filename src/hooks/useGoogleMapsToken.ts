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
export const useGoogleMapsToken = (enabled = true) => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    const fetchApiKey = async () => {
      const envFallback = () => {
        const connectorKey = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
        const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        const fallback =
          connectorKey || (envKey && envKey !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE' ? envKey : null);
        if (fallback) {
          setApiKey(fallback);
          setError(null);
          return true;
        }
        return false;
      };

      try {
        // Prefer the project-configured server key (billing-enabled), then fall back to bundled env keys.
        const { data, error: fetchError } = await supabase.functions.invoke('get-maps-api-key');

        if (!fetchError && data?.apiKey) {
          setApiKey(data.apiKey);
          setError(null);
        } else if (!envFallback()) {
          setError(data?.error || 'Google Maps API key not configured');
        }
      } catch (err) {
        console.error('Error fetching Google Maps API key:', err);
        if (!envFallback()) setError('Failed to load Google Maps');
      } finally {
        setIsLoading(false);
      }
    };

    fetchApiKey();
  }, [enabled]);

  return { apiKey, isLoading, error };
};
