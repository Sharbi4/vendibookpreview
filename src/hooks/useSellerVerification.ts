import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { openPlaidLink } from '@/lib/plaidLink';
import { loadPayPalAuthorizeSdk } from '@/lib/paypalClient';

export type VerificationStatus =
  | 'not_started'
  | 'terms_accepted'
  | 'awaiting_authorization'
  | 'authorized'
  | 'identity_in_progress'
  | 'pending_review'
  | 'payment_required'
  | 'verified'
  | 'failed'
  | 'canceled'
  | 'expired'
  | 'revoked';

export interface VerificationOffer {
  enabled: boolean;
  price_cents: number;
  currency: string;
  display_price: string;
  terms_version: string;
  retry_limit: number;
}

export interface VerificationState {
  offer: VerificationOffer;
  status: VerificationStatus;
  identity_status: string | null;
  payment_state: string;
  badge_active: boolean;
  verified_at: string | null;
  revoked: boolean;
  needs_payment_only: boolean;
  can_retry: boolean;
  retry_count: number;
  retry_allowance: number;
  has_open_authorization: boolean;
  terms_version: string;
}

type Phase =
  | 'idle'
  | 'loading'
  | 'authorizing'
  | 'verifying'
  | 'settling';

const FALLBACK_OFFER: VerificationOffer = {
  enabled: true,
  price_cents: 1999,
  currency: 'USD',
  display_price: '$19.99',
  terms_version: 'verified-seller-v1',
  retry_limit: 1,
};

const call = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke('verified-seller', { body });
  if (error) {
    // Edge errors carry a readable message in the response body.
    const detail = (data as { error?: string })?.error;
    throw new Error(detail || error.message || 'Something went wrong. Please try again.');
  }
  if ((data as { error?: string })?.error) {
    throw new Error((data as { error: string }).error);
  }
  return data as VerificationState & { order_id?: string; link_token?: string; message?: string };
};

/**
 * Verified Seller purchase + identity flow.
 *
 * The server owns every decision: the browser never sets a badge, never sees a
 * Plaid template or secret, and never treats Plaid Link's onSuccess as proof.
 */
export function useSellerVerification(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;
  const [state, setState] = useState<VerificationState | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(
    async (opts: { authoritative?: boolean } = {}) => {
      try {
        const data = await call({ action: opts.authoritative ? 'refresh' : 'status' });
        if (mounted.current) setState(data);
        return data;
      } catch (err) {
        if (mounted.current) setError((err as Error).message);
        return null;
      }
    },
    [],
  );

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setPhase('loading');
    (async () => {
      const data = await refresh();
      if (cancelled) return;
      setPhase('idle');
      // Resume anything left mid-flight so a refresh never strands a hold.
      if (data && ['identity_in_progress', 'pending_review'].includes(data.status)) {
        await refresh({ authoritative: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, refresh]);

  /** Renders PayPal's authorize-intent buttons into a container element. */
  const mountAuthorizeButtons = useCallback(
    async (
      container: HTMLElement,
      opts: {
        createOrder: () => Promise<string>;
        onAuthorized: (orderId: string) => Promise<void>;
        onError: (message: string) => void;
        onCancel?: () => void;
      },
    ) => {
      const paypal = await loadPayPalAuthorizeSdk();
      const buttons = paypal.Buttons({
        style: { layout: 'vertical', shape: 'rect', height: 46, label: 'pay' },
        createOrder: opts.createOrder,
        onApprove: async (data: { orderID: string }) => {
          await opts.onAuthorized(data.orderID);
        },
        onCancel: () => opts.onCancel?.(),
        onError: () =>
          opts.onError('PayPal could not complete the authorization. Nothing was charged.'),
      });
      if (!buttons.isEligible?.()) {
        opts.onError('PayPal is unavailable in this browser right now.');
        return () => {};
      }
      await buttons.render(container);
      return () => {
        try {
          buttons.close();
        } catch {
          /* already unmounted */
        }
      };
    },
    [],
  );

  /** Step 1 — accept terms and create the $19.99 AUTHORIZE order. */
  const start = useCallback(async (acceptedTerms: boolean) => {
    setError(null);
    setNotice(null);
    setPhase('authorizing');
    try {
      const data = await call({ action: 'start', accepted_terms: acceptedTerms });
      if (mounted.current) setState((prev) => ({ ...(prev ?? data), ...data }));
      return data.order_id ?? null;
    } catch (err) {
      if (mounted.current) {
        setError((err as Error).message);
        setPhase('idle');
      }
      return null;
    }
  }, []);

  /**
   * Step 2 — the payer approved. The server authorizes (does not charge),
   * then opens Plaid. Link closing is never treated as a result: we always ask
   * the server for the authoritative status afterwards.
   */
  const authorizeAndVerify = useCallback(
    async (orderId: string) => {
      setError(null);
      setPhase('verifying');
      try {
        const data = await call({ action: 'authorize', order_id: orderId });

        if (data.link_token) {
          const outcome = await openPlaidLink(data.link_token);
          setPhase('settling');
          const settled = await call({ action: 'refresh' });
          if (mounted.current) {
            setState(settled);
            setPhase('idle');
            if (settled.badge_active) {
              setNotice('You\u2019re verified. Your Identity Verified badge is live.');
            } else if (outcome.exited && settled.status !== 'pending_review') {
              setNotice(
                'You closed the identity check before it finished. Nothing was charged — you can pick it back up any time.',
              );
            } else if (settled.message) {
              setNotice(settled.message);
            }
          }
          return settled;
        }

        // Payment-only retry path: server already settled it.
        if (mounted.current) {
          setState((prev) => ({ ...(prev ?? data), ...data }));
          setPhase('idle');
        }
        return data;
      } catch (err) {
        if (mounted.current) {
          setError((err as Error).message);
          setPhase('idle');
        }
        await refresh();
        return null;
      }
    },
    [refresh],
  );

  /** One free retry after a failed check — uses Plaid's retry endpoint. */
  const retry = useCallback(async () => {
    setError(null);
    setNotice(null);
    setPhase('verifying');
    try {
      const data = await call({ action: 'retry' });
      if (data.order_id) {
        if (mounted.current) setPhase('authorizing');
        return { orderId: data.order_id };
      }
      if (data.link_token) {
        await openPlaidLink(data.link_token);
        setPhase('settling');
        const settled = await call({ action: 'refresh' });
        if (mounted.current) {
          setState(settled);
          setPhase('idle');
        }
        return { settled };
      }
      return {};
    } catch (err) {
      if (mounted.current) {
        setError((err as Error).message);
        setPhase('idle');
      }
      return {};
    }
  }, []);

  /**
   * Resume an identity check that is already in flight.
   *
   * Never accepts terms again and never creates or authorizes a second PayPal
   * order — the server reopens Plaid Link against the existing session (or
   * safely releases an unusable hold and says so).
   */
  const resume = useCallback(async () => {
    setError(null);
    setNotice(null);
    setPhase('verifying');
    try {
      const data = await call({ action: 'link-token' });
      if (!data.link_token) throw new Error('There is no identity check to resume.');
      await openPlaidLink(data.link_token);
      setPhase('settling');
      const settled = await call({ action: 'refresh' });
      if (mounted.current) {
        setState(settled);
        setPhase('idle');
        if (settled.badge_active) {
          setNotice('You\u2019re verified. Your Identity Verified badge is live.');
        } else if (settled.message) {
          setNotice(settled.message);
        }
      }
      return settled;
    } catch (err) {
      if (mounted.current) {
        setError((err as Error).message);
        setPhase('idle');
      }
      await refresh();
      return null;
    }
  }, [refresh]);

  /** Identity already passed — pay without repeating the identity check. */
  const completePayment = useCallback(async () => {
    setError(null);
    setPhase('authorizing');
    try {
      const data = await call({ action: 'complete-payment' });
      return data.order_id ?? null;
    } catch (err) {
      if (mounted.current) {
        setError((err as Error).message);
        setPhase('idle');
      }
      return null;
    }
  }, []);

  /** Abandons the flow and releases any hold. */
  const cancel = useCallback(async () => {
    setError(null);
    try {
      const data = await call({ action: 'cancel' });
      if (mounted.current) {
        setState(data);
        setPhase('idle');
        setNotice(data.message ?? 'Verification canceled. Nothing was charged.');
      }
    } catch (err) {
      if (mounted.current) setError((err as Error).message);
    }
  }, []);

  return {
    state,
    offer: state?.offer ?? FALLBACK_OFFER,
    phase,
    busy: phase !== 'idle',
    error,
    notice,
    setError,
    setNotice,
    refresh,
    start,
    authorizeAndVerify,
    retry,
    resume,
    completePayment,
    cancel,
    mountAuthorizeButtons,
  };
}
