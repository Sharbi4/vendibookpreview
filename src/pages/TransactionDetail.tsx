import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Shield } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StatusPillBadge, paymentPill, fulfillmentPill } from '@/components/transaction/statusPills';
import { buildTransactionTimeline, TransactionTimeline } from '@/components/transaction/TransactionTimeline';
import { computeNextAction, NextActionCard } from '@/components/transaction/NextActionCard';
import { GetHelpWithOrder } from '@/components/trust/GetHelpWithOrder';

type Tx = Record<string, any> | null;
type Listing = { id: string; title: string | null; image_urls: string[] | null; category?: string | null } | null;

function money(n: number | string | null | undefined): string {
  const v = typeof n === 'string' ? Number.parseFloat(n) : n;
  if (!Number.isFinite(v)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v as number);
}

export default function TransactionDetail() {
  const { transactionId } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tx, setTx] = useState<Tx>(null);
  const [listing, setListing] = useState<Listing>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!transactionId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('sale_transactions')
        .select('*')
        .eq('id', transactionId)
        .maybeSingle();
      if (cancelled) return;
      if (error) { setError(error.message); setLoading(false); return; }
      if (!data) { setError('Transaction not found or you do not have access.'); setLoading(false); return; }
      setTx(data);
      if (data.listing_id) {
        const { data: l } = await supabase
          .from('listings')
          .select('id, title, image_urls, category')
          .eq('id', data.listing_id)
          .maybeSingle();
        if (!cancelled) setListing(l as Listing);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [transactionId]);

  const role: 'buyer' | 'seller' | null =
    user && tx ? (user.id === tx.buyer_id ? 'buyer' : user.id === tx.seller_id ? 'seller' : null) : null;

  const timeline = useMemo(() => (tx ? buildTransactionTimeline(tx) : []), [tx]);
  const nextAction = useMemo(() => (tx ? computeNextAction(tx, role) : null), [tx, role]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08080a] text-white">
        <Header />
        <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-orange-400" /></div>
        <Footer />
      </div>
    );
  }

  if (error || !tx) {
    return (
      <div className="min-h-screen bg-[#08080a] text-white">
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="text-2xl font-semibold">Transaction unavailable</h1>
          <p className="mt-2 text-sm text-white/60">{error ?? 'This transaction could not be loaded.'}</p>
          <Link to="/transactions" className="mt-6 inline-flex items-center gap-2 text-orange-300 hover:text-orange-200">
            <ArrowLeft className="h-4 w-4" /> Back to transactions
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const pay = paymentPill(tx.status);
  const ful = fulfillmentPill({
    fulfillmentType: tx.fulfillment_type,
    shippingStatus: tx.shipping_status,
    buyerConfirmed: !!tx.buyer_confirmed_at,
    sellerConfirmed: !!tx.seller_confirmed_at,
    status: tx.status,
  });

  const heroImg = listing?.image_urls?.[0] ?? null;
  const subtotal = Number(tx.amount ?? 0);
  const fees = Number(tx.platform_fee ?? 0);
  const delivery = Number(tx.delivery_fee ?? 0) + Number(tx.freight_cost ?? 0);
  const discount = Number(tx.promo_discount ?? 0);
  const total = subtotal + delivery - discount;

  return (
    <div className="min-h-screen bg-[#08080a] text-white">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <Link to="/transactions" className="mb-4 inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80">
          <ArrowLeft className="h-3.5 w-3.5" /> All transactions
        </Link>

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {heroImg ? (
              <img src={heroImg} alt="" className="h-16 w-16 rounded-xl object-cover ring-1 ring-white/10" />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-white/5 ring-1 ring-white/10" />
            )}
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-white/50">
                Order #{String(tx.id).slice(0, 8).toUpperCase()}
              </div>
              <h1 className="mt-0.5 text-2xl font-semibold">{listing?.title ?? 'Sale'}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusPillBadge pill={pay} />
                <StatusPillBadge pill={ful} />
                {role && (
                  <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-white/60 ring-1 ring-white/10">
                    You are the {role}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Link
            to={`/sale/${tx.id}/protection`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-white/80 hover:bg-white/[0.06]"
          >
            <Shield className="h-3.5 w-3.5 text-orange-400" /> Protected Sale
          </Link>
        </div>

        {/* Next action */}
        {nextAction && <NextActionCard action={nextAction} className="mt-6" />}

        {/* Content grid */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card className="border-white/10 bg-white/[0.03] p-5 lg:col-span-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">Timeline</h2>
            <div className="mt-4">
              <TransactionTimeline events={timeline} />
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="border-white/10 bg-white/[0.03] p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">Summary</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <Row label="Subtotal" value={money(subtotal)} />
                {delivery > 0 && <Row label={tx.fulfillment_type === 'freight' ? 'Freight' : 'Delivery'} value={money(delivery)} />}
                {discount > 0 && <Row label="Discount" value={`− ${money(discount)}`} />}
                <div className="my-2 border-t border-white/10" />
                <Row label="Total" value={money(total)} strong />
                {role === 'seller' && tx.platform_fee != null && (
                  <Row label="Vendibook fee" value={`− ${money(fees)}`} muted />
                )}
                {role === 'seller' && tx.seller_payout != null && (
                  <Row label="Your payout" value={money(tx.seller_payout)} strong />
                )}
              </dl>
            </Card>

            <Card className="border-white/10 bg-white/[0.03] p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">Fulfillment</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <Row label="Method" value={(tx.fulfillment_type ?? '—').toString().replace('_', ' ')} />
                {tx.tracking_number && (
                  <Row
                    label="Tracking"
                    value={tx.tracking_url
                      ? <a href={tx.tracking_url} target="_blank" rel="noreferrer" className="text-orange-300 hover:text-orange-200">{tx.carrier ?? 'Track'} · {tx.tracking_number}</a>
                      : `${tx.carrier ?? ''} ${tx.tracking_number}`}
                  />
                )}
                {tx.estimated_delivery_date && <Row label="Est. delivery" value={new Date(tx.estimated_delivery_date).toLocaleDateString()} />}
                {tx.delivery_address && <Row label="Address" value={tx.delivery_address} />}
                {tx.delivery_instructions && <Row label="Notes" value={tx.delivery_instructions} />}
              </dl>
            </Card>
          </div>
        </div>

        {role && (
          <GetHelpWithOrder
            role={role}
            transactionId={String(tx.id)}
            listingId={listing?.id ?? tx.listing_id ?? null}
            orderTotal={total}
            orderLabel={`#${String(tx.id).slice(0, 8).toUpperCase()}`}
            refundEligible={
              role === 'buyer' &&
              ['paid', 'shipped', 'delivered', 'completed'].includes(String(tx.status ?? '')) &&
              tx.status !== 'refunded' &&
              tx.status !== 'disputed'
            }
            disputeEligible={
              ['paid', 'shipped', 'delivered'].includes(String(tx.status ?? '')) ||
              (role === 'seller' && tx.status === 'disputed')
            }
            className="mt-6"
          />
        )}
      </main>
      <Footer />
    </div>
  );
}

function Row({ label, value, strong, muted }: { label: string; value: React.ReactNode; strong?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={`text-xs ${muted ? 'text-white/40' : 'text-white/60'}`}>{label}</dt>
      <dd className={`text-right ${strong ? 'text-base font-semibold text-white' : muted ? 'text-white/50' : 'text-white/90'}`}>{value}</dd>
    </div>
  );
}
