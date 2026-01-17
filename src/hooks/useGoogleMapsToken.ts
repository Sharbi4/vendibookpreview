import { useState, useEffect } from 'react';

/**
 * Hook to access the Google Maps API key.
 * 
 * SECURITY NOTE: This uses a publishable API key that is intended for client-side use.
 * The key should be restricted in Google Cloud Console to:
 * - Specific HTTP referrers (your domain)
 * - Specific APIs (Maps JavaScript API, Places API)
 * 
 * This is the standard security practice for client-side map libraries.
 */
export const useGoogleMapsToken = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Use environment variable for publishable Google Maps API key
    // This key should be restricted in Google Cloud Console to specific domains
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (key) {
      setApiKey(key);
      setError(null);
    } else {
      setError('Google Maps API key not configured');
    }
    setIsLoading(false);
  }, []);

  return { apiKey, isLoading, error };
};
