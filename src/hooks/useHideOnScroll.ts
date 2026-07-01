import { useEffect, useState } from 'react';

/**
 * Returns true when the user is actively scrolling down past a threshold,
 * false when at rest or scrolling up. Meant for hiding sticky mobile bars
 * to hand more screen back to the content while scrolling.
 */
export function useHideOnScroll(threshold = 24) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY;
        // Ignore rubber-band / tiny jitter
        if (Math.abs(delta) > 6) {
          if (delta > 0 && y > threshold) setHidden(true);
          else if (delta < 0) setHidden(false);
          lastY = y;
        }
        ticking = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return hidden;
}
