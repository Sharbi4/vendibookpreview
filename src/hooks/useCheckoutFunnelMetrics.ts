import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  CHECKOUT_ABANDONED_EVENT,
  CHECKOUT_COMPLETED_EVENT,
  CHECKOUT_FUNNEL_STEPS,
  CHECKOUT_STEP_VIEW_EVENT,
  type CheckoutFlow,
} from '@/lib/checkoutFunnel';

export interface CheckoutFunnelStep {
  stepId: string;
  label: string;
  reached: number;
  abandoned: number;
  /** % of people on the previous step who did not reach this one. */
  dropOff: number;
}

export interface CheckoutFunnelFlow {
  flow: CheckoutFlow;
  steps: CheckoutFunnelStep[];
  completed: number;
  /** Step id with the largest count of abandonments. */
  worstStep: string | null;
}

const LABELS: Record<string, string> = {
  review: 'Review',
  fulfillment: 'Fulfillment',
  use: 'Use',
  details: 'Details',
  agreement: 'Agreement',
  payment: 'Payment',
};

/** Admin: where buyers and renters leave the checkout wizard. */
export const useCheckoutFunnelMetrics = (days = 30) => {
  return useQuery({
    queryKey: ['checkout-funnel-metrics', days],
    queryFn: async (): Promise<CheckoutFunnelFlow[]> => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from('analytics_events')
        .select('event_name, metadata')
        .eq('event_category', 'checkout')
        .gte('created_at', since.toISOString())
        .in('event_name', [
          CHECKOUT_STEP_VIEW_EVENT,
          CHECKOUT_ABANDONED_EVENT,
          CHECKOUT_COMPLETED_EVENT,
        ])
        .not('metadata->>is_internal', 'eq', 'true');

      if (error) throw error;

      const rows = (data || []) as Array<{
        event_name: string;
        metadata: Record<string, unknown> | null;
      }>;

      return (['sale', 'rental'] as CheckoutFlow[]).map((flow) => {
        const forFlow = rows.filter((r) => r.metadata?.flow === flow);
        const count = (event: string, stepId: string) =>
          forFlow.filter((r) => r.event_name === event && r.metadata?.step_id === stepId).length;

        let worstStep: string | null = null;
        let worstCount = 0;

        const steps = CHECKOUT_FUNNEL_STEPS[flow].map((stepId, index, all) => {
          const reached = count(CHECKOUT_STEP_VIEW_EVENT, stepId);
          const abandoned = count(CHECKOUT_ABANDONED_EVENT, stepId);
          const prev = index > 0 ? count(CHECKOUT_STEP_VIEW_EVENT, all[index - 1]) : reached;
          const dropOff = index > 0 && prev > 0 ? ((prev - reached) / prev) * 100 : 0;

          if (abandoned > worstCount) {
            worstCount = abandoned;
            worstStep = stepId;
          }

          return {
            stepId,
            label: LABELS[stepId] ?? stepId,
            reached,
            abandoned,
            dropOff: Math.max(0, dropOff),
          };
        });

        return {
          flow,
          steps,
          completed: forFlow.filter((r) => r.event_name === CHECKOUT_COMPLETED_EVENT).length,
          worstStep,
        };
      });
    },
    staleTime: 1000 * 60 * 5,
  });
};

export default useCheckoutFunnelMetrics;
