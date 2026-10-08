import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CASE_STATUS_LABEL, issueLabel } from '@/lib/disputes';

/**
 * Money-center entry to disputes: open cases first, then the two ways in
 * (report a problem on an order, or browse every case). Every dispute is a
 * Vendibook case that freezes the seller payment until an admin decides.
 */
export default function PaymentsDisputesEntry() {
  const { user } = useAuth();
  const { data: cases = [] } = useQuery({
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
    <div className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold">Disputes &amp; problems</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Something wrong with an order? Open a case from the order. The seller payment is paused while
              Vendibook reviews it, both sides can add statements and photos, and we decide on a refund or release.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="v2-btn-outline" to="/dashboard/transactions">Report a problem with an order</Link>
          <Link className="v2-btn-quiet" to="/dashboard/cases">All support cases</Link>
        </div>
      </div>

      {cases.length > 0 && (
        <ul className="mt-5 space-y-2" aria-label="Open cases">
          {cases.map((c) => (
            <li key={c.id}>
              <Link
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-4 py-3 text-sm hover:bg-muted/40"
                to={c.payment_record_id ? `/dashboard/transactions/${c.payment_record_id}/case/${c.id}` : `/cases/${c.id}`}
              >
                <span className="font-medium">{c.case_number} · {issueLabel(c.issue_type)}</span>
                <span className="text-muted-foreground">{CASE_STATUS_LABEL[c.status] || c.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
