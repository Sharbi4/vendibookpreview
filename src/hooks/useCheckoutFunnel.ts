import { useCallback, useEffect, useRef } from 'react';
import {
  isCheckoutSuccessPath,
  trackCheckoutAbandoned,
  trackCheckoutCompleted,
  trackCheckoutStepView,
  type CheckoutFlow,
} from '@/lib/checkoutFunnel';

interface Options {
  flow: CheckoutFlow;
  /** 1-based wizard step currently on screen. */
  step: number;
  listingId?: string | null;
  /** Only start recording once the flow is actually usable. */
  active?: boolean;
}

/**
 * Records checkout step views and a single abandonment event for the step the
 * buyer was on when they left. Leaving to a confirmation/order page counts as
 * completed, not abandoned.
 */
export function useCheckoutFunnel({ flow, step, listingId, active = true }: Options) {
  const stepRef = useRef(step);
  const doneRef = useRef(false);
  const firedRef = useRef(false);
  const activeRef = useRef(active);

  stepRef.current = step;
  activeRef.current = active;

  useEffect(() => {
    if (!active) return;
    trackCheckoutStepView({ flow, step, listingId });
  }, [flow, step, listingId, active]);

  const markCompleted = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    trackCheckoutCompleted({ flow, step: stepRef.current, listingId });
  }, [flow, listingId]);

  useEffect(() => {
    if (!active) return;

    const finish = (reason: 'left_page' | 'closed_tab') => {
      if (doneRef.current || firedRef.current) return;
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      if (isCheckoutSuccessPath(path)) {
        doneRef.current = true;
        trackCheckoutCompleted({ flow, step: stepRef.current, listingId });
        return;
      }
      firedRef.current = true;
      trackCheckoutAbandoned({ flow, step: stepRef.current, listingId, reason });
    };

    const onHide = () => finish('closed_tab');
    window.addEventListener('pagehide', onHide);

    return () => {
      window.removeEventListener('pagehide', onHide);
      finish('left_page');
    };
  }, [flow, listingId, active]);

  return { markCompleted };
}

export default useCheckoutFunnel;
