import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import OrderCaseSection from '@/components/disputes/OrderCaseSection';
import { CASE_STATUS_LABEL, issueLabel } from '@/lib/disputes';

export default function WorkspaceCases() {
  const { user } = useAuth();
  const { caseId, orderId } = useParams();
  const { data: cases, isLoading, error } = useQuery({
    queryKey: ['workspace-cases', user?.id, caseId], enabled: !!user,
    queryFn: async () => {
      let query = supabase.from('dispute_cases').select('id, case_number, status, issue_type, payment_record_id, buyer_id, seller_id, created_at, response_deadline_at, paypal_dispute_status').or(`buyer_id.eq.${user!.id},seller_id.eq.${user!.id}`).order('created_at', { ascending: false });
      if (caseId) query = query.eq('id', caseId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
  const selected = cases?.find(c => c.id === caseId);
  // Existing notification URLs resolve to the same canonical case page.
  if (selected?.payment_record_id && !orderId) return <Navigate replace to={`/dashboard/transactions/${selected.payment_record_id}/case/${selected.id}`} />;
  return <WorkspaceShell><div className="v2-page-stack"><header className="v2-page-heading"><p className="v2-eyebrow">Transaction support</p><h1>{caseId ? 'Case details' : 'Support cases'}</h1><p>Your Vendibook cases and their latest updates.</p><Link className="inline-block underline mt-3" to="/dashboard/transactions">Back to transactions</Link></header>
    {isLoading ? <p role="status">Loading cases…</p> : error ? <p role="alert">We couldn't load your cases. Please refresh to try again.</p> : caseId ? selected?.payment_record_id === orderId ? <><Button asChild variant="outline"><Link to={`/dashboard/transactions/${orderId}`}>View transaction, documents & tracking</Link></Button><OrderCaseSection orderId={orderId!} caseId={caseId} viewerRole={selected.buyer_id === user?.id ? 'buyer' : 'seller'} canReport={false} /></> : <p>Case unavailable for this transaction.</p> : !cases?.length ? <section className="v2-panel p-6"><h2>No support cases</h2><p className="mt-2 text-muted-foreground">To report an issue, open the relevant transaction. Its payment and handoff records will stay connected to your case.</p></section> : cases.map(c => <Link key={c.id} className="v2-panel block p-5" to={c.payment_record_id ? `/dashboard/transactions/${c.payment_record_id}/case/${c.id}` : '/help'}><p className="font-semibold">{c.case_number} · {issueLabel(c.issue_type)}</p><p className="text-sm mt-2">Vendibook: {CASE_STATUS_LABEL[c.status] || c.status}</p>{c.paypal_dispute_status && <p className="text-sm mt-1">PayPal: {c.paypal_dispute_status}</p>}{c.response_deadline_at && <p className="text-xs text-muted-foreground mt-2">Vendibook response due {new Date(c.response_deadline_at).toLocaleString()}</p>}</Link>)}
  </div></WorkspaceShell>;
}
