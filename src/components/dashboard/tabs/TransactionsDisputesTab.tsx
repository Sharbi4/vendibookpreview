import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  useUserTransactions,
  DISPUTE_REASONS,
  OPEN_DISPUTE_STATUSES,
  type UserTransaction,
} from '@/hooks/useUserTransactions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import EmptyState from '../shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Receipt, ShieldAlert, ExternalLink } from 'lucide-react';

type FilterId = 'all' | 'purchases' | 'sales' | 'refunded' | 'disputes';

const FILTERS: { id: FilterId; label: string; match: (t: UserTransaction) => boolean }[] = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'purchases', label: 'Purchases', match: (t) => t.role === 'buyer' },
  { id: 'sales', label: 'Sales', match: (t) => t.role === 'seller' },
  { id: 'refunded', label: 'Refunded', match: (t) => (t.refunded_cents ?? 0) > 0 },
  { id: 'disputes', label: 'Disputes', match: (t) => !!t.dispute_status && t.dispute_status !== 'none' },
];

const TYPE_LABEL: Record<string, string> = {
  sale: 'Purchase',
  booking: 'Booking',
  monetization: 'Vendibook upgrade',
  subscription: 'Membership',
  deposit: 'Deposit',
};

const DISPUTE_LABEL: Record<string, { label: string; tone: string }> = {
  buyer_reported: { label: 'Dispute — buyer reported', tone: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  seller_reported: { label: 'Dispute — seller reported', tone: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  open: { label: 'Dispute open', tone: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  under_review: { label: 'Under review', tone: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  resolved: { label: 'Dispute resolved', tone: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  none: { label: 'No dispute', tone: 'bg-white/5 text-muted-foreground border-white/10' },
};

const money = (cents?: number | null, currency = 'USD') =>
  cents == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);

const TransactionsDisputesTab = () => {
  const { user } = useAuth();
  const { transactions, isLoading, refresh } = useUserTransactions(user?.id);
  const [filter, setFilter] = useState<FilterId>('all');
  const [target, setTarget] = useState<UserTransaction | null>(null);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const fn = FILTERS.find((f) => f.id === filter)?.match ?? (() => true);
    return transactions.filter(fn);
  }, [transactions, filter]);

  const closeDialog = () => {
    setTarget(null);
    setReason('');
    setDetails('');
  };

  const submitDispute = async () => {
    if (!target) return;
    if (!reason) return toast.error('Choose a reason for the dispute.');
    if (details.trim().length < 20) return toast.error('Please describe the problem in a little more detail.');
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('payment-dispute-report', {
        body: { payment_record_id: target.id, reason, details: details.trim() },
      });
      if (error) throw error;
      if ((data as any)?.already_open) {
        toast.info('A dispute is already open on this transaction.');
      } else {
        toast.success('Dispute submitted — our team will be in touch.');
      }
      closeDialog();
      await refresh();
    } catch (_err) {
      toast.error('We could not submit that dispute. Please try again or contact support.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1080px] mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">PayPal transactions & disputes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every payment you've made or received through Vendibook, with PayPal transaction IDs, refunds and dispute status.
        </p>
      </header>

      <BoostHistoryPanel />



      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={
              'text-xs font-medium px-3 py-1.5 rounded-full border transition ' +
              (filter === f.id
                ? 'bg-foreground text-background border-foreground'
                : 'bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-foreground/40')
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={filter === 'all' ? 'No transactions yet' : 'Nothing here'}
          description="Payments you make or receive through Vendibook show up here with full PayPal transaction details."
          ctaLabel="Browse listings"
          ctaHref="/search"
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((t) => {
            const disputeKey = t.dispute_status && t.dispute_status !== 'none' ? t.dispute_status : null;
            const dispute = disputeKey ? DISPUTE_LABEL[disputeKey] ?? DISPUTE_LABEL.open : null;
            const canDispute =
              t.payment_status === 'completed' &&
              (!t.dispute_status || !OPEN_DISPUTE_STATUSES.includes(t.dispute_status));
            return (
              <li
                key={t.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {t.listing?.title ?? TYPE_LABEL[t.transaction_type ?? ''] ?? 'Vendibook payment'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {TYPE_LABEL[t.transaction_type ?? ''] ?? t.transaction_type ?? 'Payment'} ·{' '}
                      {t.role === 'buyer' ? 'You paid' : 'You were paid'} ·{' '}
                      {new Date(t.captured_at ?? t.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {money(t.gross_amount_cents, t.currency ?? 'USD')}
                    </p>
                    {(t.refunded_cents ?? 0) > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Refunded {money(t.refunded_cents, t.currency ?? 'USD')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-[11px] border-white/10 bg-white/5">
                    {t.payment_status ?? 'unknown'}
                  </Badge>
                  {dispute && (
                    <Badge variant="outline" className={`text-[11px] ${dispute.tone}`}>
                      {dispute.label}
                    </Badge>
                  )}
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Order {t.reference ?? t.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">PayPal order ID</dt>
                    <dd className="font-mono text-foreground/80 truncate">{t.paypal_order_id ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">PayPal transaction ID</dt>
                    <dd className="font-mono text-foreground/80 truncate">{t.paypal_capture_id ?? '—'}</dd>
                  </div>
                  {t.role === 'seller' && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Your proceeds</dt>
                      <dd className="text-foreground/80">{money(t.seller_proceeds_cents, t.currency ?? 'USD')}</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Payment method</dt>
                    <dd className="text-foreground/80 capitalize">
                      {(t.payment_source ?? 'paypal').replace(/_/g, ' ')}
                    </dd>
                  </div>
                </dl>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                    <Link to={`/orders/${t.id}`}>
                      View order & receipt <ExternalLink className="ml-1.5 h-3 w-3" />
                    </Link>
                  </Button>
                  {canDispute && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setTarget(t)}
                    >
                      <ShieldAlert className="mr-1.5 h-3.5 w-3.5" /> Report a problem
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!target} onOpenChange={(open) => (!open ? closeDialog() : null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Report a problem</DialogTitle>
            <DialogDescription>
              Tell us what went wrong with{' '}
              {target?.listing?.title ?? `order ${target?.reference ?? target?.id.slice(0, 8).toUpperCase()}`}.
              Vendibook reviews every dispute manually and will contact both sides.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a reason" />
              </SelectTrigger>
              <SelectContent>
                {DISPUTE_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={5}
              placeholder="Describe what happened, including dates and any communication with the other party."
              className="text-base sm:text-sm"
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog} disabled={submitting}>Cancel</Button>
            <Button onClick={submitDispute} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TransactionsDisputesTab;
