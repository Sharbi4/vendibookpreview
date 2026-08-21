import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Loader2, ArrowLeft, MessageSquare, MapPin, Truck, Package, CheckCircle2, Clock, LayoutDashboard,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { buildTransactionTimeline, TransactionTimeline } from '@/components/transaction/TransactionTimeline';
import { GetHelpWithOrder } from '@/components/trust/GetHelpWithOrder';
import { DocumentsCard } from '@/components/documents/DocumentsCard';
import { SaleHandoffActions } from '@/components/sale/SaleHandoffActions';
import {
  handoffChip, handoffMethod, handoffNextStep, handoffStage, isCommitted,
  METHOD_LABEL, PAYOUT_COPY, type HandoffRole,
} from '@/lib/sale/handoff';
import { isPickupLocationRevealed, PICKUP_LOCKED_MESSAGE } from '@/lib/fulfillment/pickupReveal';

type Tx = (Record<string, any> & { id: string }) | null;
type Listing = {
  id: string; title: string | null; image_urls: string[] | null; cover_image_url?: string | null;
  pickup_location_text?: string | null; pickup_instructions?: string | null; city?: string | null; state?: string | null;
} | null;

const money = (n: number | string | null | undefined): string => {
  const v = typeof n === 'string' ? Number.parseFloat(n) : n;
  if (!Number.isFinite(v)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v as number);
};

const chipTone: Record<string, string> = {
  positive: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  active: 'bg-orange-50 text-orange-700 ring-orange-200',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  critical: 'bg-red-50 text-red-700 ring-red-200',
  neutral: 'bg-muted text-muted-foreground ring-border',
};

export default function TransactionDetail() {
  const { transactionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tx, setTx] = useState<Tx>(null);
  const [listing, setListing] = useState<Listing>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!transactionId) return;
    const { data, error: err } = await supabase
      .from('sale_transactions')
      .select('*')
      .eq('id', transactionId)
      .maybeSingle();
    if (err) { setError(err.message); setLoading(false); return; }
    if (!data) { setError('This transaction is not available on your account.'); setLoading(false); return; }
    setTx(data);
    if (data.listing_id) {
      const { data: l } = await supabase
        .from('listings')
        .select('id, title, image_urls, cover_image_url, pickup_location_text, pickup_instructions, city, state')
        .eq('id', data.listing_id)
        .maybeSingle();
      setListing(l as Listing);
    }
    setLoading(false);
  }, [transactionId]);

  useEffect(() => { void load(); }, [load]);

  const role: HandoffRole | null =
    user && tx ? (user.id === tx.buyer_id ? 'buyer' : user.id === tx.seller_id ? 'seller' : null) : null;

  const timeline = useMemo(() => (tx ? buildTransactionTimeline(tx) : []), [tx]);

  const openMessages = useCallback(async () => {
    if (!tx) return;
    const { data: convo } = await supabase
      .from('conversations')
      .select('id')
      .eq('listing_id', tx.listing_id)
      .eq('host_id', tx.seller_id)
      .eq('shopper_id', tx.buyer_id)
      .maybeSingle();
    if (convo?.id) { navigate(`/messages/${convo.id}`); return; }
    if (role === 'buyer') {
      const { data: created } = await supabase
        .from('conversations')
        .insert({ listing_id: tx.listing_id, host_id: tx.seller_id, shopper_id: tx.buyer_id })
        .select('id')
        .maybeSingle();
      if (created?.id) { navigate(`/messages/${created.id}`); return; }
    }
    navigate('/messages');
  }, [tx, role, navigate]);

  if (loading) {
    return (
      <div className="sale-light min-h-screen">
        <Header />
        <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-orange-500" /></div>
        <Footer />
      </div>
    );
  }

  if (error || !tx || !role) {
    return (
      <div className="sale-light min-h-screen">
        <Header />
        <main className="mx-auto max-w-lg px-4 py-20 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Transaction unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error ?? 'This order belongs to another account.'}
          </p>
          <Button asChild variant="cta" className="mt-6"><Link to="/dashboard">Back to dashboard</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  const method = handoffMethod(tx);
  const stage = handoffStage(tx);
  const chip = handoffChip(tx, role);
  const step = handoffNextStep(tx, role);
  const committed = isCommitted(tx);

  const heroImg = listing?.cover_image_url ?? listing?.image_urls?.[0] ?? null;
  const orderRef = `VB-${String(tx.id).slice(0, 8).toUpperCase()}`;
  const subtotal = Number(tx.amount ?? 0);
  const delivery = Number(tx.delivery_fee ?? 0) + Number(tx.freight_cost ?? 0);
  const discount = Number(tx.promo_discount ?? 0);
  const total = subtotal + delivery - discount;
  const freightUnpaid = method === 'freight' && tx.freight_payment_status !== 'paid';

  const pickupRevealed = isPickupLocationRevealed({
    fulfillmentType: 'pickup',
    status: tx.status,
    paymentStatus: tx.payment_intent_id ? 'paid' : null,
  });

  return (
    <div className="sale-light min-h-screen">
      <SEO title={`Order ${orderRef} · Vendibook`} description="Your Vendibook sale status and handoff steps." noindex />
      <Header />

      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
        <Link to="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
        </Link>

        {/* Confirmation header */}
        <section className="rounded-3xl bg-sale-card p-5 sm:p-7">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${chipTone[chip.tone]}`}>
            {chip.tone === 'positive' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
            {chip.label}
          </span>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
            {heroImg && (
              <img src={heroImg} alt={listing?.title ?? 'Purchased item'} loading="lazy"
                className="h-24 w-full rounded-2xl object-cover sm:h-20 sm:w-28" />
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold leading-tight text-foreground sm:text-2xl">
                {listing?.title ?? 'Equipment sale'}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Order {orderRef} · {new Date(tx.created_at).toLocaleDateString()} · You are the {role}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {role === 'buyer' ? 'Paid today' : 'Sale price'}
              </p>
              <p className="text-2xl font-semibold text-foreground">{money(role === 'buyer' ? total : subtotal)}</p>
            </div>
          </div>
        </section>

        {/* One primary next step */}
        <section className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-5 sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-700">
            {step.done ? 'Complete' : step.waiting ? 'Waiting on them' : 'Your next step'}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">{step.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <SaleHandoffActions
              transactionId={String(tx.id)}
              role={role}
              step={step}
              onMessage={openMessages}
              onDone={() => void load()}
            />
            <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={() => void openMessages()}>
              <MessageSquare className="mr-2 h-4 w-4" />
              {role === 'buyer' ? 'Message seller' : 'Message buyer'}
            </Button>
            <Button asChild variant="ghost" size="lg" className="w-full sm:w-auto">
              <Link to={role === 'buyer' ? '/dashboard?tab=purchases' : '/dashboard?tab=sales'}>
                <LayoutDashboard className="mr-2 h-4 w-4" /> View in dashboard
              </Link>
            </Button>
          </div>
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          {/* Fulfillment */}
          <section className="rounded-3xl bg-sale-card p-5 sm:p-6">
            <div className="flex items-center gap-2">
              {method === 'pickup' ? <MapPin className="h-4 w-4 text-orange-500" /> : <Truck className="h-4 w-4 text-orange-500" />}
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {METHOD_LABEL[method]}
              </h2>
            </div>

            {method === 'pickup' ? (
              <div className="mt-3 space-y-2 text-sm">
                {pickupRevealed ? (
                  <>
                    <p className="font-medium text-foreground">
                      {listing?.pickup_location_text
                        ?? [listing?.city, listing?.state].filter(Boolean).join(', ')
                        ?? 'Pickup location shared by the seller'}
                    </p>
                    {listing?.pickup_instructions && (
                      <p className="text-muted-foreground">{listing.pickup_instructions}</p>
                    )}
                    <p className="text-muted-foreground">
                      Agree on a pickup window in messages. {role === 'buyer'
                        ? 'Inspect the item before you confirm pickup.'
                        : 'Confirm the handoff once the buyer collects the item.'}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">{PICKUP_LOCKED_MESSAGE}</p>
                )}
              </div>
            ) : (
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-muted-foreground">
                  {stage === 'in_transit'
                    ? 'This item is on its way to the delivery address below.'
                    : stage === 'delivered'
                      ? 'The seller marked this delivered. Confirmation closes the sale.'
                      : 'Delivery is being coordinated between buyer and seller.'}
                </p>
                {committed && tx.delivery_address && (
                  <p className="font-medium text-foreground">{tx.delivery_address}</p>
                )}
                {committed && tx.delivery_instructions && (
                  <p className="text-muted-foreground">{tx.delivery_instructions}</p>
                )}
                {tx.tracking_number && (
                  <p className="text-muted-foreground">
                    {tx.carrier ? `${tx.carrier} · ` : ''}
                    {tx.tracking_url
                      ? <a href={tx.tracking_url} target="_blank" rel="noreferrer" className="text-orange-600 underline">{tx.tracking_number}</a>
                      : tx.tracking_number}
                  </p>
                )}
                {freightUnpaid && (
                  <p className="rounded-xl bg-muted p-3 text-muted-foreground">
                    Freight is quoted and paid separately from this purchase. Nothing for freight was charged in this order.
                  </p>
                )}
              </div>
            )}

            {/* Counterparty details, only once the sale is committed */}
            {role === 'seller' && committed && (
              <div className="mt-4 rounded-2xl bg-muted p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Buyer</p>
                <p className="mt-1 font-medium text-foreground">{tx.buyer_name ?? 'Buyer'}</p>
                {tx.buyer_email && <p className="text-muted-foreground break-all">{tx.buyer_email}</p>}
                {tx.buyer_phone && <p className="text-muted-foreground">{tx.buyer_phone}</p>}
                <p className="mt-2 text-xs text-muted-foreground">
                  Shared for fulfillment on this sale only.
                </p>
              </div>
            )}
          </section>

          {/* Summary */}
          <section className="rounded-3xl bg-sale-card p-5 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Summary</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Item" value={money(subtotal)} />
              {delivery > 0 && <Row label={method === 'freight' ? 'Freight' : 'Delivery'} value={money(delivery)} />}
              {discount > 0 && <Row label="Discount" value={`− ${money(discount)}`} />}
              <div className="my-2 h-px bg-border" />
              <Row label={role === 'buyer' ? 'Total paid' : 'Buyer total'} value={money(total)} strong />
              {role === 'seller' && tx.platform_fee != null && (
                <Row label="Vendibook fee" value={`− ${money(tx.platform_fee)}`} />
              )}
              {role === 'seller' && tx.seller_payout != null && (
                <Row label="Your proceeds" value={money(tx.seller_payout)} strong />
              )}
              <Row label="Reference" value={orderRef} />
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">{PAYOUT_COPY}</p>
          </section>
        </div>

        <section className="mt-4 rounded-3xl bg-sale-card p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-orange-500" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Progress</h2>
          </div>
          <div className="mt-4">
            <TransactionTimeline events={timeline} />
          </div>
        </section>

        <GetHelpWithOrder
          role={role}
          transactionId={String(tx.id)}
          listingId={listing?.id ?? tx.listing_id ?? null}
          orderTotal={total}
          orderLabel={`#${String(tx.id).slice(0, 8).toUpperCase()}`}
          refundEligible={
            role === 'buyer' &&
            ['paid', 'shipped', 'delivered', 'completed'].includes(String(tx.status ?? '')) &&
            tx.status !== 'refunded' && tx.status !== 'disputed'
          }
          disputeEligible={
            ['paid', 'shipped', 'delivered'].includes(String(tx.status ?? '')) ||
            (role === 'seller' && tx.status === 'disputed')
          }
          className="mt-4"
        />

        <div className="mt-4">
          <DocumentsCard scope={{ transaction_id: String(tx.id) }} title="Bill of sale" />
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`text-right ${strong ? 'text-base font-semibold text-foreground' : 'text-foreground/90'}`}>{value}</dd>
    </div>
  );
}
