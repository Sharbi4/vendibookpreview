import { useEffect, useRef, useState } from 'react';

/**
 * Reports whether the referenced element is at least `threshold` visible
 * inside the viewport. Used to drive muted autoplay loops on the homepage
 * so animations only run while on-screen.
 */
export function useInViewAutoplay<T extends Element = HTMLDivElement>(
  threshold = 0.4,
): { ref: React.MutableRefObject<T | null>; inView: boolean } {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio >= threshold),
      { threshold: [0, threshold, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, inView };
}
