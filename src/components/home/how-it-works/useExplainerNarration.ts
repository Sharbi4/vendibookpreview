import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Explainer } from '../data/explainers';

interface CacheEntry {
  url: string;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Fetches (and caches) a signed URL for the pre-rendered narration audio
 * of an explainer. The backend `explainer-tts` function is cache-first: it
 * generates the MP3 exactly once per (explainer + script + voice) tuple
 * and re-serves it from private storage on every subsequent request.
 */
export function useExplainerNarration(explainer: Explainer) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useMemo(() => `${explainer.id}:${explainer.narrationScript}`, [explainer]);
  const abortRef = useRef<AbortController | null>(null);

  const fetchUrl = useCallback(async () => {
    const hit = cache.get(key);
    // Cached URL is a signed URL valid 24h — reuse for 1h to stay safe.
    if (hit && Date.now() - hit.fetchedAt < 60 * 60 * 1000) {
      setAudioUrl(hit.url);
      return hit.url;
    }
    setLoading(true);
    setError(null);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const { data, error } = await supabase.functions.invoke('explainer-tts', {
        body: { explainer_id: explainer.id, script: explainer.narrationScript },
      });
      if (error) throw error;
      const url = (data as { audio_url?: string } | null)?.audio_url;
      if (!url) throw new Error('No audio_url returned');
      cache.set(key, { url, fetchedAt: Date.now() });
      setAudioUrl(url);
      return url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unable to load narration';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [explainer.id, explainer.narrationScript, key]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { audioUrl, loading, error, fetchUrl };
}
