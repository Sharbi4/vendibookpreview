import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CASE_STATUS_LABEL, issueLabel } from '@/lib/disputes';
import { Panel, StatusPill, ws } from '@/components/workspace/ui';

/**
 * Money-center entry to disputes: open cases first, then the two ways in
 * (report a problem on an order, or browse every case). Every dispute is a
 * Vendibook case; payouts on that order pause until an admin decides.
 */
export default function PaymentsDisputesEntry() {
  const { user } = useAuth();
  const { data: cases = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['payments-open-cases', user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dispute_cases')
        .select('id, case_number, status, issue_type, payment_record_id, created_at')
        .or(`buyer_id.eq.${user!.id},seller_id.eq.${user!.id}`)
        .not('status', 'in', '(resolved,closed)')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Panel
      title="Disputes"
      description="Something wrong with an order? Open a case from the order. Payouts on that order pause while Vendibook reviews the case, and both sides can add statements and photos."
      action={{ label: 'All cases', to: '/dashboard/cases' }}
      flush
      footer={
        <Link className={ws.actionLink} to="/dashboard/transactions">
          Report a problem with an order <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      }
    >
      {isLoading ? (
        <div className="px-5 py-4 sm:px-6"><span className={ws.skeleton + ' block h-4 w-48'} /></div>
      ) : isError ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
          <p className="text-[14px] text-[#1C1B1A]">Your cases could not be loaded.</p>
          <button type="button" className={ws.actionLink} onClick={() => refetch()}>Retry</button>
        </div>
      ) : cases.length > 0 ? (
        <ul className="divide-y divide-[#F1ECE5]" aria-label="Open cases">
          {cases.map((c) => (
            <li key={c.id}>
              <Link
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 text-[14px] transition-colors hover:bg-[#FCFAF7] sm:px-6"
                to={c.payment_record_id ? `/dashboard/transactions/${c.payment_record_id}/case/${c.id}` : `/cases/${c.id}`}
              >
                <span className="font-semibold text-[#1C1B1A]">{c.case_number} · {issueLabel(c.issue_type)}</span>
                <StatusPill tone="warn">{CASE_STATUS_LABEL[c.status] || c.status}</StatusPill>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 py-4 text-[14px] text-[#5E5953] sm:px-6">No open cases.</p>
      )}
    </Panel>
  );
}
