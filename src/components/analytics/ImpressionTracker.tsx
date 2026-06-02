import { useEffect, useRef } from 'react';
import { trackLeadEvent, type LeadEventName, type LeadEventPayload } from '@/lib/leadTracking';

interface ImpressionTrackerProps {
  eventName: LeadEventName;
  payload: LeadEventPayload;
  /** Dedup key — only fire once per mount for a given key */
  dedupKey: string;
  threshold?: number;
  children: React.ReactNode;
  className?: string;
}

const fired = new Set<string>();

/**
 * Fires a lead event once when the wrapped element enters the viewport.
 * Used to capture search_result_impression for funnel diagnostics.
 */
export const ImpressionTracker = ({
  eventName,
  payload,
  dedupKey,
  threshold = 0.5,
  children,
  className,
}: ImpressionTrackerProps) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || fired.has(dedupKey)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !fired.has(dedupKey)) {
            fired.add(dedupKey);
            try {
              trackLeadEvent(eventName, payload);
            } catch {
              /* swallow tracking errors */
            }
            observer.disconnect();
          }
        }
      },
      { threshold }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [dedupKey, eventName, payload, threshold]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
};
