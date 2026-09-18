import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHandoffContext, type FulfillmentSession } from '@/hooks/useHandoff';

const DELIVERY_MODES = ['seller_delivery', 'third_party_driver', 'vendibook_freight'];

/**
 * Live delivery session for one order.
 *
 * Reads the session through the authorized handoff context, then keeps it fresh
 * with Realtime so the buyer's map moves without refreshing the page. Access is
 * enforced server-side (RLS + handoff-ops), never in this hook.
 */
export function useDeliveryTracking(saleTransactionId?: string | null, bookingId?: string | null) {
  const { data, isLoading, refresh } = useHandoffContext(saleTransactionId ?? null, bookingId ?? null);
  const [live, setLive] = useState<FulfillmentSession | null>(null);

  const base = useMemo<FulfillmentSession | null>(() => {
    const sessions = (data?.fulfillment_sessions ?? []).filter((s) => DELIVERY_MODES.includes(s.mode));
    if (sessions.length === 0) return null;
    const open = sessions.find((s) => !['completed', 'cancelled'].includes(s.status));
    return open ?? sessions[0];
  }, [data]);

  useEffect(() => {
    setLive(null);
    if (!base?.id) return;
    const channel = supabase
      .channel(`delivery-session-${base.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'fulfillment_sessions', filter: `id=eq.${base.id}` },
        (payload) => setLive(payload.new as unknown as FulfillmentSession),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [base?.id]);

  const session = live && base && live.id === base.id ? { ...base, ...live } : base;

  return {
    session,
    viewerRole: data?.viewer_role ?? null,
    isLoading,
    refresh,
  };
}

export function isDeliveryMode(mode?: string | null) {
  return !!mode && DELIVERY_MODES.includes(mode);
}
