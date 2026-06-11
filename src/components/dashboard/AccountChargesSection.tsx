import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Receipt, ExternalLink, Gift, RefreshCcw, Clock, FileText, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import BoostChargeDetailsModal from './BoostChargeDetailsModal';

export interface BoostCharge {
  listing_id: string;
  listing_title: string | null;
  source: string; // 'stripe' | 'comp'
  status: 'paid' | 'comped' | 'refunded' | 'expired' | 'unknown';
  amount: string | null;
  paid_at: string | null;
  applied_at: string | null;
  applied_expires_at: string | null;
  featured_expires_at: string | null;
  featured_enabled: boolean;
  receipt_id: string | null;
  receipt_url: string | null;
  reason: string | null;
  refunded_at: string | null;
  refund_amount: string | null;
  isActive: boolean;
}

const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const AccountChargesSection: React.FC<{ userId: string }> = ({ userId }) => {
  const [loading, setLoading] = useState(true);
  const [charges, setCharges] = useState<BoostCharge[]>([]);
  const [selected, setSelected] = useState<BoostCharge | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('listings')
        .select('id, title, featured_enabled, featured_expires_at, pending_featured_payment')
        .eq('host_id', userId)
        .not('pending_featured_payment', 'is', null)
        .order('featured_at', { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error('[AccountCharges] fetch error', error);
        setCharges([]);
      } else {
        const now = Date.now();
        const mapped: BoostCharge[] = (data || []).map((row: any) => {
          const p = row.pending_featured_payment || {};
          const expires = p.applied_expires_at || row.featured_expires_at;
          // Derive status if older records didn't store one
          let status: BoostCharge['status'] = p.status || (p.source === 'comp' ? 'comped' : 'paid');
          if (status !== 'refunded') {
            if (expires && new Date(expires).getTime() < now && !row.featured_enabled) {
              status = 'expired';
            }
          }
          const isActive = !!row.featured_enabled && !!expires && new Date(expires).getTime() > now && status !== 'refunded';

          return {
            listing_id: row.id,
            listing_title: row.title,
            source: p.source || 'stripe',
            status,
            amount: p.amount || null,
            paid_at: p.paid_at || null,
            applied_at: p.applied_at || null,
            applied_expires_at: p.applied_expires_at || null,
            featured_expires_at: row.featured_expires_at,
            featured_enabled: !!row.featured_enabled,
            receipt_id: p.payment_intent_id || p.session_id || null,
            receipt_url: p.receipt_url || null,
            reason: p.reason || null,
            refunded_at: p.refunded_at || null,
            refund_amount: p.refund_amount || null,
            isActive};
        });
        mapped.sort((a, b) => {
          if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
          return (b.paid_at || '').localeCompare(a.paid_at || '');
        });
        setCharges(mapped);
      }
      setLoading(false);
    };

    load();

    // Realtime: re-fetch on any listing change for this host (covers refunds + expiry updates)
    const channel = supabase
      .channel(`account-charges-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'listings', filter: `host_id=eq.${userId}` },
        () => { load(); }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const openDetails = (c: BoostCharge) => {
    setSelected(c);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (charges.length === 0) {
    return (
      <div className="rounded-xl border border-border p-8 text-center bg-card">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
          <Receipt className="h-6 w-6 text-muted-foreground" />
        </div>
        <h4 className="font-semibold mb-1">No account charges yet</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Featured Boost payments and listing add-ons will appear here.
        </p>
        <Button asChild variant="outline">
          <Link to="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {charges.map((c) => {
          const isComp = c.source === 'comp';
          const isRefunded = c.status === 'refunded';
          const expires = c.applied_expires_at || c.featured_expires_at;

          let badgeNode;
          if (isRefunded) {
            badgeNode = (
              <Badge className="bg-rose-500/15 text-rose-500 hover:bg-rose-500/15 border-0 gap-1">
                <RefreshCcw className="h-3 w-3" /> Refunded
              </Badge>
            );
          } else if (c.isActive) {
            badgeNode = <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15 border-0">Active</Badge>;
          } else if (c.status === 'expired') {
            badgeNode = (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" /> Expired
              </Badge>
            );
          } else {
            badgeNode = <Badge variant="secondary">Ended</Badge>;
          }

          return (
            <div
              key={`${c.listing_id}-${c.receipt_id ?? c.paid_at ?? Math.random()}`}
              className="rounded-xl border border-border bg-card p-5 flex items-start gap-4"
            >
              <div className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center ${isComp ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                {isComp ? <Gift className="h-5 w-5" /> : null}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground truncate">
                    Featured Boost · {c.listing_title || 'Untitled listing'}
                  </h3>
                  {badgeNode}
                  {isComp && !isRefunded && (
                    <Badge className="bg-primary/15 text-primary hover:bg-primary/15 border-0">Comped</Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1 text-sm text-muted-foreground">
                  <div>
                    <span className="block text-xs uppercase tracking-wide text-muted-foreground/70">Amount</span>
                    <span className={`font-medium ${isRefunded ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {c.amount || (isComp ? '$0.00 (comped)' : '—')}
                    </span>
                    {isRefunded && c.refund_amount && (
                      <span className="block text-xs text-rose-500">-{c.refund_amount} refunded</span>
                    )}
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wide text-muted-foreground/70">Charged</span>
                    <span className="text-foreground">{fmtDate(c.paid_at)}</span>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wide text-muted-foreground/70">
                      {isRefunded ? 'Refunded' : 'Expires'}
                    </span>
                    <span className="text-foreground">{fmtDate(isRefunded ? c.refunded_at : expires)}</span>
                  </div>
                </div>

                {(c.receipt_id || c.reason) && (
                  <p className="text-xs text-muted-foreground mt-2 truncate">
                    {c.reason ? <>Reason: {c.reason}</> : <>Receipt ID: <span className="font-mono">{c.receipt_id}</span></>}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-1">
                  <Button variant="ghost" size="sm" className="gap-1 -ml-2" onClick={() => openDetails(c)}>
                    <Info className="h-3.5 w-3.5" />
                    Details
                  </Button>
                  {c.receipt_url && (
                    <Button asChild variant="ghost" size="sm" className="gap-1">
                      <a href={c.receipt_url} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-3.5 w-3.5" />
                        Receipt
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                  <Button asChild variant="ghost" size="sm" className="gap-1">
                    <Link to={`/listing/${c.listing_id}`}>
                      View listing
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <BoostChargeDetailsModal
        charge={selected}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
};

export default AccountChargesSection;
