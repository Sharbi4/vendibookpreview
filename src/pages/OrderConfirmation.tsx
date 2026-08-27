import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  Mail,
  MapPin,
  Receipt,
  ShieldCheck,
} from 'lucide-react';

import SEO from '@/components/SEO';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { supabase } from '@/integrations/supabase/client';

interface OrderRecord {
  reference: string;
  created_at: string;
  captured_at: string | null;
  currency: string;
  gross_amount_cents: number;
  tax_cents: number;
  discount_cents: number;
  captured_amount_cents: number;
  payment_status: string;
  payment_intent: string;
  payment_source: string | null;
  transaction_type: string;
  listing_id: string | null;
  buyer_email: string | null;
  metadata: Record<string, unknown> | null;
}

interface ListingInfo {
  id: string;
  title: string;
  cover_image_url: string | null;
  city: string | null;
  state: string | null;
}

const usd = (cents: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format((cents ?? 0) / 100);

const TYPE_LABELS: Record<string, string> = {
  sale: 'Equipment purchase',
  rental: 'Rental booking',
  booking: 'Rental booking',
  product: 'Vendibook add-on',
  freight: 'Freight shipping',
  notary: 'Notary service',
  concierge: 'Concierge listing service',
  protected_sale_deposit: 'Protected deposit',
};

/**
 * Premium post-payment confirmation: receipt, fulfillment details and the
 * exact next steps. Read-only — it never mutates the order and relies on the
 * buyer's own row-level access to their payment record.
 */
const OrderConfirmation = () => {
  const { reference: routeReference } = useParams<{ reference: string }>();
  const [params] = useSearchParams();
  const reference = routeReference ?? params.get('ref') ?? '';

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [listing, setListing] = useState<ListingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!reference) {
      setLoading(false);
      setError('We could not find that order reference.');
      return;
    }

    (async () => {
      const { data, error: err } = await supabase
        .from('payment_records')
        .select(
          'reference, created_at, captured_at, currency, gross_amount_cents, tax_cents, discount_cents, captured_amount_cents, payment_status, payment_intent, payment_source, transaction_type, listing_id, buyer_email, metadata',
        )
        .eq('reference', reference)
        .maybeSingle();

      if (cancelled) return;

      if (err || !data) {
        setError(
          'We could not load this order. If you were just charged, sign in with the account you paid from — your receipt is also in your email.',
        );
        setLoading(false);
        return;
      }

      setOrder(data as unknown as OrderRecord);

      if (data.listing_id) {
        const { data: l } = await supabase
          .from('listings')
          .select('id, title, cover_image_url, city, state')
          .eq('id', data.listing_id)
          .maybeSingle();
        if (!cancelled && l) setListing(l as ListingInfo);
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [reference]);

  const status = order?.payment_status ?? '';
  const isAuthorized = order?.payment_intent === 'AUTHORIZE' && status !== 'captured';
  const isPending = status === 'pending' || status === 'created';

  const subtotalCents = useMemo(() => {
    if (!order) return 0;
    return Math.max(0, order.gross_amount_cents - (order.tax_cents ?? 0));
  }, [order]);

  const totalCents = order
    ? order.captured_amount_cents || order.gross_amount_cents
    : 0;

  const nextSteps = useMemo(() => {
    const type = order?.transaction_type ?? '';
    if (type === 'sale' || type === 'protected_sale_deposit') {
      return [
        'The seller has been notified and will confirm handoff details with you.',
        'Coordinate pickup, delivery or freight through your Vendibook messages.',
        'Your payment is released to the seller only after the handoff is confirmed.',
      ];
    }
    if (type === 'rental' || type === 'booking') {
      return [
        'Your host has been notified and your dates are held.',
        'Sign any required rental agreement and upload insurance documents if requested.',
        'Pickup or delivery details appear on your booking page before the start date.',
      ];
    }
    if (type === 'product') {
      return [
        'Your purchase is unlocked on your dashboard right away.',
        'Featured placement, when included, starts within a few minutes.',
        'Your receipt is on its way to your inbox.',
      ];
    }
    return [
      'Your receipt is on its way to your inbox.',
      'Our team follows up with anything else needed for this order.',
    ];
  }, [order]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Order confirmation | Vendibook" description="Your Vendibook order receipt and next steps." noindex />
      <Header />

      <main className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(80%_60%_at_50%_0%,hsl(var(--primary)/0.10),transparent_70%)]"
        />

        <div className="relative mx-auto max-w-4xl px-5 pb-24 pt-12 md:pt-16">
          {error || !order ? (
            <div className="rounded-[26px] border border-border/70 bg-card p-8 text-center shadow-[0_40px_120px_-60px_rgba(24,20,16,0.4)]">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Order not found</h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{error}</p>
              <Link
                to="/dashboard"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-95"
              >
                Go to dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <>
              <header className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                  {isAuthorized ? (
                    <ShieldCheck className="h-8 w-8 text-primary" />
                  ) : isPending ? (
                    <Clock className="h-8 w-8 text-primary" />
                  ) : (
                    <CheckCircle2 className="h-8 w-8 text-primary" />
                  )}
                </div>
                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  {TYPE_LABELS[order.transaction_type] ?? 'Vendibook order'}
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-[2.6rem]">
                  {isAuthorized
                    ? 'Payment authorized'
                    : isPending
                      ? 'Payment is being confirmed'
                      : 'Payment confirmed'}
                </h1>
                <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
                  {isAuthorized
                    ? 'PayPal is holding these funds. You are only charged once this transaction is confirmed.'
                    : isPending
                      ? 'PayPal is still clearing this payment. Nothing further is needed from you — we will email you the moment it settles.'
                      : 'Thank you. Your order is confirmed and a receipt is on its way to your inbox.'}
                </p>
                <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
                  <Receipt className="h-3.5 w-3.5" /> Order {order.reference}
                </p>
              </header>

              <div className="mt-10 grid gap-6 md:grid-cols-5">
                {/* Receipt */}
                <section className="md:col-span-3 rounded-[26px] border border-border/70 bg-card p-7 shadow-[0_40px_120px_-70px_rgba(24,20,16,0.45)]">
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">Receipt</h2>

                  {listing ? (
                    <div className="mt-5 flex items-center gap-4 rounded-2xl border border-border/60 bg-muted/25 p-4">
                      {listing.cover_image_url ? (
                        <img
                          src={listing.cover_image_url}
                          alt={listing.title}
                          loading="lazy"
                          className="h-16 w-20 rounded-xl object-cover"
                        />
                      ) : null}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{listing.title}</p>
                        {listing.city || listing.state ? (
                          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {[listing.city, listing.state].filter(Boolean).join(', ')}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  <dl className="mt-6 space-y-2.5 text-sm">
                    <div className="flex items-baseline justify-between">
                      <dt className="text-muted-foreground">Subtotal</dt>
                      <dd className="text-foreground">{usd(subtotalCents, order.currency)}</dd>
                    </div>
                    {order.discount_cents > 0 ? (
                      <div className="flex items-baseline justify-between">
                        <dt className="text-muted-foreground">Discount</dt>
                        <dd className="text-foreground">-{usd(order.discount_cents, order.currency)}</dd>
                      </div>
                    ) : null}
                    <div className="flex items-baseline justify-between">
                      <dt className="text-muted-foreground">Sales tax</dt>
                      <dd className="text-foreground">{usd(order.tax_cents ?? 0, order.currency)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between border-t border-border/70 pt-3">
                      <dt className="font-medium text-foreground">
                        {isAuthorized ? 'Authorized total' : 'Total paid'}
                      </dt>
                      <dd className="text-2xl font-semibold tracking-tight text-foreground">
                        {usd(totalCents, order.currency)}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-6 space-y-1.5 border-t border-border/70 pt-5 text-xs text-muted-foreground">
                    <p>
                      Paid with{' '}
                      {order.payment_source === 'apple_pay'
                        ? 'Apple Pay'
                        : order.payment_source === 'google_pay'
                          ? 'Google Pay'
                          : order.payment_source === 'card'
                            ? 'card via PayPal'
                            : 'PayPal'}
                    </p>
                    <p>
                      {new Date(order.captured_at ?? order.created_at).toLocaleString('en-US', {
                        dateStyle: 'long',
                        timeStyle: 'short',
                      })}
                    </p>
                    {order.buyer_email ? (
                      <p className="inline-flex items-center gap-1.5">
                        <Mail className="h-3 w-3" /> Receipt sent to {order.buyer_email}
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="mt-6 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/40"
                  >
                    <Download className="h-4 w-4" /> Save receipt
                  </button>
                </section>

                {/* Fulfillment + next steps */}
                <aside className="md:col-span-2 space-y-6">
                  <section className="rounded-[26px] border border-border/70 bg-card p-7 shadow-[0_40px_120px_-70px_rgba(24,20,16,0.45)]">
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">Fulfillment</h2>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {order.transaction_type === 'sale' || order.transaction_type === 'protected_sale_deposit'
                        ? 'Handoff is arranged directly with the seller. Pickup, local delivery and freight options appear on your order page.'
                        : order.transaction_type === 'rental' || order.transaction_type === 'booking'
                          ? 'Pickup or delivery is arranged with your host. Exact address details unlock once the booking is confirmed.'
                          : 'This is a digital purchase — nothing ships. It is active on your Vendibook account.'}
                    </p>
                  </section>

                  <section className="rounded-[26px] border border-border/70 bg-card p-7 shadow-[0_40px_120px_-70px_rgba(24,20,16,0.45)]">
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">What happens next</h2>
                    <ol className="mt-4 space-y-3">
                      {nextSteps.map((step, i) => (
                        <li key={step} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                          <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-primary/12 text-[11px] font-semibold text-primary">
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </section>

                  <div className="space-y-2.5">
                    <Link
                      to="/dashboard"
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-95"
                    >
                      Go to dashboard <ArrowRight className="h-4 w-4" />
                    </Link>
                    {listing ? (
                      <Link
                        to={`/listing/${listing.id}`}
                        className="flex w-full items-center justify-center rounded-full border border-border/70 bg-background px-6 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/40"
                      >
                        View listing
                      </Link>
                    ) : null}
                    <Link
                      to="/help"
                      className="block pt-1 text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
                    >
                      Need help with this order?
                    </Link>
                  </div>
                </aside>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default OrderConfirmation;
