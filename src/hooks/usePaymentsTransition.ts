import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type MembershipTransitionState = 'all_set' | 'needs_paypal_authorization' | 'none';

export interface PaymentsTransitionState {
  isLoading: boolean;
  /** Seller has a live listing plus a legacy card-payment marker. */
  isEligible: boolean;
  /** They have already seen and dismissed the one-time notice. */
  acknowledged: boolean;
  membership: MembershipTransitionState;
  hasPayoutPreference: boolean;
  /** A compact dashboard reminder is still warranted after dismissal. */
  needsFollowUp: boolean;
  acknowledge: () => Promise<void>;
}

/** Per-user local latch so the one-time notice never reappears. */
const ackKey = (userId: string) => `vb.paymentsTransitionAck.${userId}`;
const readLocalAck = (userId: string) => {
  try {
    return !!window.localStorage.getItem(ackKey(userId));
  } catch {
    return false;
  }
};

const PAYPAL_ACTIVE = ['active', 'approved', 'trialing'];
const STRIPE_ACTIVE = ['active', 'trialing', 'past_due'];

/**
 * Data-driven state for the one-time "Vendibook payments are now powered by
 * PayPal" notice. Nothing here gates publishing, checkout, or visibility —
 * it is purely informational.
 */
export function usePaymentsTransition(): PaymentsTransitionState {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isEligible, setIsEligible] = useState(false);
  const [acknowledged, setAcknowledged] = useState(true);
  const [membership, setMembership] = useState<MembershipTransitionState>('none');
  const [hasPayoutPreference, setHasPayoutPreference] = useState(true);

  useEffect(() => {
    let active = true;
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        const [profileRes, listingRes, payoutRes, subsRes] = await Promise.all([
          (supabase as any)
            .from('profiles')
            .select('stripe_account_id, stripe_onboarding_complete, stripe_onboarding_started_at, payments_transition_ack_at')
            .eq('id', user.id)
            .maybeSingle(),
          (supabase as any)
            .from('listings')
            .select('id')
            .eq('host_id', user.id)
            .eq('status', 'published')
            .limit(1),
          (supabase as any)
            .from('payout_preferences')
            .select('id, method')
            .eq('user_id', user.id)
            .maybeSingle(),
          (supabase as any)
            .from('host_subscriptions')
            .select('status, payment_provider, paypal_subscription_id, stripe_subscription_id')
            .eq('user_id', user.id),
        ]);

        if (!active) return;

        const profile = profileRes?.data ?? null;
        const rows = (subsRes?.data ?? []) as any[];

        const hasPaypal = rows.some(
          (r) =>
            (r.payment_provider === 'paypal' || !!r.paypal_subscription_id) &&
            PAYPAL_ACTIVE.includes(String(r.status)),
        );
        const hasLegacyStripe = rows.some(
          (r) =>
            !!r.stripe_subscription_id &&
            r.payment_provider !== 'paypal' &&
            STRIPE_ACTIVE.includes(String(r.status)),
        );

        const membershipState: MembershipTransitionState = hasPaypal
          ? 'all_set'
          : hasLegacyStripe
            ? 'needs_paypal_authorization'
            : 'none';

        const legacyCardMarker =
          !!profile?.stripe_account_id ||
          profile?.stripe_onboarding_complete === true ||
          !!profile?.stripe_onboarding_started_at ||
          hasLegacyStripe;

        setMembership(membershipState);
        setAcknowledged(!!profile?.payments_transition_ack_at);
        setHasPayoutPreference(!!payoutRes?.data?.id);
        setIsEligible(legacyCardMarker && (listingRes?.data ?? []).length > 0);
      } catch {
        // Never block a dashboard on this informational read.
        if (active) setIsEligible(false);
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const acknowledge = useCallback(async () => {
    setAcknowledged(true);
    if (!user?.id) return;
    // Local latch first: even if the profile write fails (offline, RLS, race),
    // the one-time notice must never come back on the next dashboard visit.
    try {
      window.localStorage.setItem(ackKey(user.id), new Date().toISOString());
    } catch {
      /* storage unavailable */
    }
    try {
      await (supabase as any)
        .from('profiles')
        .update({ payments_transition_ack_at: new Date().toISOString() })
        .eq('id', user.id);
    } catch {
      /* dismissal is best-effort */
    }
  }, [user?.id]);

  return {
    isLoading,
    isEligible,
    acknowledged,
    membership,
    hasPayoutPreference,
    needsFollowUp:
      isEligible && (!hasPayoutPreference || membership === 'needs_paypal_authorization'),
    acknowledge,
  };
}
