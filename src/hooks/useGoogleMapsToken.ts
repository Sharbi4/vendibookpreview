import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to access the Google Maps API key.
 *
 * The key is fetched once per browser session (cached in-memory + sessionStorage)
 * so that mounting several maps never re-triggers an edge function round trip.
 */
const STORAGE_KEY = 'vb_gmaps_key';

let cachedKey: string | null = null;
let inFlight: Promise<string | null> | null = null;

const readEnvKey = (): string | null => {
  const connectorKey = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
  const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  return connectorKey || (envKey && envKey !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE' ? envKey : null);
};

const readSessionKey = (): string | null => {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const resolveKey = (): Promise<string | null> => {
  if (cachedKey) return Promise.resolve(cachedKey);

  const stored = readSessionKey();
  if (stored) {
    cachedKey = stored;
    return Promise.resolve(stored);
  }

  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-maps-api-key');
      const key = (!error && data?.apiKey) || readEnvKey();
      if (key) {
        cachedKey = key;
        try {
          sessionStorage.setItem(STORAGE_KEY, key);
        } catch {
          /* ignore quota / private-mode errors */
        }
      }
      return key ?? null;
    } catch (err) {
      console.error('Error fetching Google Maps API key:', err);
      const fallback = readEnvKey();
      if (fallback) cachedKey = fallback;
      return fallback;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
};

export const useGoogleMapsToken = (enabled = true) => {
  const initial = cachedKey ?? readSessionKey();
  const [apiKey, setApiKey] = useState<string | null>(initial);
  const [isLoading, setIsLoading] = useState(enabled && !initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || apiKey) {
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);

    resolveKey().then((key) => {
      if (!active) return;
      if (key) {
        setApiKey(key);
        setError(null);
      } else {
        setError('Google Maps API key not configured');
      }
      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [enabled, apiKey]);

  return { apiKey, isLoading, error };
};
