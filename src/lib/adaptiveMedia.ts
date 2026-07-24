/**
 * Adaptive media policy — reads Save-Data, effective connection type, and
 * the `prefers-reduced-data` media query so heavy media surfaces (explainer
 * videos, ambient audio, animated backdrops) can degrade gracefully on
 * mobile / metered / slow connections.
 *
 * SSR-safe: returns a conservative default when window / navigator are
 * unavailable.
 */

type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g' | string;
  downlink?: number;
  addEventListener?: (t: 'change', cb: () => void) => void;
  removeEventListener?: (t: 'change', cb: () => void) => void;
};

export interface AdaptiveMediaPolicy {
  /** True when the user is on a slow / metered / data-saver connection. */
  dataSaver: boolean;
  /** True when the user has requested reduced motion. */
  reducedMotion: boolean;
  /** Recommended `<img>` decoding hint. */
  decoding: 'async' | 'sync' | 'auto';
  /** Recommended `<img>` fetchpriority hint. */
  fetchPriority: 'high' | 'low' | 'auto';
  /** Skip narration TTS fetch (expensive + audible autoplay). */
  disableTts: boolean;
  /** Skip ambient Web Audio bed. */
  disableAmbient: boolean;
  /** Drop backdrop loop animation + heavy blur. */
  disableBackdropAnim: boolean;
}

const readConnection = (): NetworkInformation | null => {
  if (typeof navigator === 'undefined') return null;
  const n = navigator as unknown as { connection?: NetworkInformation; mozConnection?: NetworkInformation; webkitConnection?: NetworkInformation };
  return n.connection ?? n.mozConnection ?? n.webkitConnection ?? null;
};

export const getAdaptiveMediaPolicy = (): AdaptiveMediaPolicy => {
  if (typeof window === 'undefined') {
    return {
      dataSaver: false,
      reducedMotion: false,
      decoding: 'async',
      fetchPriority: 'low',
      disableTts: false,
      disableAmbient: false,
      disableBackdropAnim: false,
    };
  }
  const conn = readConnection();
  const reducedData = window.matchMedia?.('(prefers-reduced-data: reduce)').matches ?? false;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const slowNet = !!conn && (
    conn.saveData === true ||
    conn.effectiveType === '2g' ||
    conn.effectiveType === 'slow-2g' ||
    (typeof conn.downlink === 'number' && conn.downlink > 0 && conn.downlink < 1.2)
  );
  const dataSaver = reducedData || slowNet;
  return {
    dataSaver,
    reducedMotion,
    decoding: 'async',
    fetchPriority: dataSaver ? 'low' : 'auto',
    disableTts: dataSaver,
    disableAmbient: dataSaver || reducedMotion,
    disableBackdropAnim: dataSaver || reducedMotion,
  };
};

/**
 * React hook that returns the current adaptive-media policy and re-evaluates
 * when the connection or preferred motion/data settings change.
 */
import { useEffect, useState } from 'react';

export const useAdaptiveMediaPolicy = (): AdaptiveMediaPolicy => {
  const [policy, setPolicy] = useState<AdaptiveMediaPolicy>(() => getAdaptiveMediaPolicy());
  useEffect(() => {
    const recompute = () => setPolicy(getAdaptiveMediaPolicy());
    const conn = readConnection();
    conn?.addEventListener?.('change', recompute);
    const mqReducedData = window.matchMedia?.('(prefers-reduced-data: reduce)');
    const mqReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    mqReducedData?.addEventListener?.('change', recompute);
    mqReducedMotion?.addEventListener?.('change', recompute);
    return () => {
      conn?.removeEventListener?.('change', recompute);
      mqReducedData?.removeEventListener?.('change', recompute);
      mqReducedMotion?.removeEventListener?.('change', recompute);
    };
  }, []);
  return policy;
};
