import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface HandoffTask {
  id: string;
  label: string;
  hint: string;
  to: string;
  tone?: 'warn';
}

const hrefFor = (row: { sale_transaction_id: string | null; booking_id: string | null }) =>
  row.sale_transaction_id ? `/handoff/sale/${row.sale_transaction_id}` : `/handoff/booking/${row.booking_id}`;

/**
 * Real Verified Handoff tasks for the signed-in user. RLS already limits rows
 * to transactions the user is a participant in — nothing is inferred here.
 */
export function useHandoffTasks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['handoff-tasks', user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async (): Promise<HandoffTask[]> => {
      const uid = user!.id;
      const [handoffs, fulfillments] = await Promise.all([
        supabase
          .from('handoff_sessions')
          .select('id, sale_transaction_id, booking_id, seller_id, buyer_id, mode, status, pickup_code_verified_at, walkthrough_completed_at, buyer_decision, finalized')
          .eq('finalized', false)
          .order('started_at', { ascending: false })
          .limit(20),
        supabase
          .from('fulfillment_sessions')
          .select('id, sale_transaction_id, booking_id, seller_id, buyer_id, mode, status, driver_name, started_at, tracking_active, tracking_paused, assigned_driver_user_id')
          .in('status', ['pending', 'en_route', 'arrived'])
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      const tasks: HandoffTask[] = [];

      for (const h of handoffs.data ?? []) {
        const isSeller = h.seller_id === uid;
        const isBuyer = h.buyer_id === uid;
        const to = hrefFor(h);

        if (h.mode === 'buyer_pickup' && !h.pickup_code_verified_at) {
          tasks.push(
            isBuyer
              ? { id: `pickup-code-${h.id}`, label: 'Enter your pickup code', hint: 'Confirm you are with the seller to start the handoff.', to }
              : { id: `pickup-share-${h.id}`, label: 'Share your pickup code', hint: 'The buyer needs the 6-digit code to confirm the handoff.', to },
          );
          continue;
        }
        if (!h.walkthrough_completed_at) {
          tasks.push({ id: `walkthrough-${h.id}`, label: 'Walkthrough incomplete', hint: 'Record the condition walkthrough to document this handoff.', to });
          continue;
        }
        if (!h.buyer_decision) {
          tasks.push(
            isBuyer
              ? { id: `condition-${h.id}`, label: 'Review the condition', hint: 'Accept, accept with exceptions, or report an issue.', to, tone: 'warn' }
              : { id: `condition-wait-${h.id}`, label: 'Waiting on the buyer’s condition review', hint: 'The buyer still needs to confirm the handoff.', to },
          );
          continue;
        }
        if (h.buyer_decision === 'issue_reported') {
          tasks.push({
            id: `issue-${h.id}`,
            label: isSeller ? 'Buyer reported an issue' : 'Issue documented at handoff',
            hint: 'Continue in support. The transaction is not marked complete.',
            to,
            tone: 'warn',
          });
          continue;
        }
        tasks.push({
          id: `sign-${h.id}`,
          label: 'Handoff acknowledgment pending',
          hint: 'Finish the Handoff & Condition Acknowledgment.',
          to,
        });
      }

      for (const f of fulfillments.data ?? []) {
        const isSeller = f.seller_id === uid;
        const to = hrefFor(f);
        const orderHref = f.sale_transaction_id ? `/orders/${f.sale_transaction_id}` : `/orders/${f.booking_id}`;
        const deliveryHref = f.sale_transaction_id ? `/delivery/sale/${f.sale_transaction_id}` : `/delivery/booking/${f.booking_id}`;
        const isDriver = f.assigned_driver_user_id === uid;
        const isDelivery = f.mode === 'seller_delivery' || f.mode === 'third_party_driver';

        if (isDelivery && (isSeller || isDriver) && !f.tracking_active && f.status !== 'arrived') {
          tasks.push({ id: `start-delivery-${f.id}`, label: 'Delivery ready to start', hint: 'Open Delivery mode to share live location with the buyer.', to: deliveryHref });
          continue;
        }
        if (isDelivery && (isSeller || isDriver) && f.tracking_active) {
          tasks.push({ id: `finish-delivery-${f.id}`, label: 'Mark delivery complete', hint: 'The buyer is expecting delivery — update the status when you arrive.', to: deliveryHref });
          continue;
        }
        if (isDelivery && !isSeller && !isDriver && f.tracking_active) {
          tasks.push({ id: `live-${f.id}`, label: 'Your delivery is on the way', hint: 'Follow it live on your order page.', to: orderHref });
          continue;
        }
        if (f.mode === 'third_party_driver' && f.status === 'pending') {
          tasks.push({ id: `driver-${f.id}`, label: 'Driver hasn’t started', hint: 'Share or re-issue the secure driver link.', to, tone: 'warn' });
        } else if (f.status === 'arrived' && !isSeller) {
          tasks.push({ id: `arrived-${f.id}`, label: 'Your delivery has arrived', hint: 'Start the handoff walkthrough.', to });
        } else if (!isSeller && f.status === 'en_route') {
          tasks.push({ id: `track-${f.id}`, label: 'Track your delivery', hint: 'Follow the documented delivery to your location.', to });
        }
      }

      return tasks.slice(0, 6);
    },
  });
}
