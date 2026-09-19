import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Loader2, MapPin, Printer, Receipt } from 'lucide-react';

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
  refunded_cents: number | null;
  payment_status: string;
  payment_intent: string;
  payment_source: string | null;
  paypal_capture_id: string | null;
  metadata: Record<string, unknown> | null;
  transaction_type: string;
  listing_id: string | null;
  seller_id: string | null;
  sale_transaction_id: string | null;
  booking_request_id: string | null;
  buyer_email: string | null;
  order_items: unknown;
  shipping_address: Record<string, unknown> | null;
}

interface ListingInfo {
  id: string;
  title: string;
  cover_image_url: string | null;
  description: string | null;
  amenities: string[] | null;
  make: string | null;
  model: string | null;
  category: string | null;
  city: string | null;
  state: string | null;
}

interface SaleInfo {
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_address1: string | null;
  buyer_address2: string | null;
  buyer_city: string | null;
  buyer_state: string | null;
  buyer_zip: string | null;
  fulfillment_type: string | null;
  delivery_address: string | null;
  delivery_instructions: string | null;
  shipping_notes: string | null;
  estimated_delivery_date: string | null;
}

interface BookingInfo {
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  fulfillment_selected: string | null;
  delivery_address: string | null;
  delivery_instructions: string | null;
  message: string | null;
  status: string | null;
  host_id: string | null;
}

interface ReceiptLine {
  label: string;
  detail?: string;
  qty: number;
  unitCents: number;
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

const FULFILLMENT_LABELS: Record<string, string> = {
  pickup: 'Buyer pickup',
  delivery: 'Seller delivery',
  freight: 'Vendibook freight',
  on_site: 'On-site use',
  both: 'Pickup or delivery',
};

/** Normalises the stored PayPal line items into receipt rows. */
const toLines = (raw: unknown): ReceiptLine[] => {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const line = entry as Record<string, any>;
    const unitCents = typeof line.unitAmountCents === 'number'
      ? line.unitAmountCents
      : Math.round(Number(line.unit_amount?.value ?? 0) * 100);
    if (!Number.isFinite(unitCents)) return [];
    return [{
      label: String(line.name ?? 'Item'),
      detail: line.description && line.description !== line.name ? String(line.description) : undefined,
      qty: Math.max(1, Math.round(Number(line.quantity ?? 1))),
      unitCents,
    }];
  });
};

/**
 * A real receipt — not a "payment approved" splash. It states the issue date
 * and time, what was bought (with the item's photo, description and listed
 * features), the exact price breakdown, fulfillment and delivery notes, and
 * who the buyer and seller are. Read-only: it never mutates the order and
 * relies on the buyer's own row-level access to their payment record.
 */
const OrderReceipt = () => {
  const { reference: routeReference } = useParams<{ reference: string }>();
  const [params] = useSearchParams();
  const reference = routeReference ?? params.get('ref') ?? '';

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [listing, setListing] = useState<ListingInfo | null>(null);
  const [sale, setSale] = useState<SaleInfo | null>(null);
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [seller, setSeller] = useState<{ name: string | null; city: string | null; state: string | null } | null>(null);
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
          'reference, created_at, captured_at, currency, paypal_capture_id, metadata, gross_amount_cents, tax_cents, discount_cents, captured_amount_cents, refunded_cents, payment_status, payment_intent, payment_source, transaction_type, listing_id, seller_id, sale_transaction_id, booking_request_id, buyer_email, order_items, shipping_address',
        )
        .eq('reference', reference)
        .maybeSingle();

      if (cancelled) return;

      if (err || !data) {
        setError(
          'We could not load this receipt. Sign in with the account you paid from — a copy is also in your email.',
        );
        setLoading(false);
        return;
      }

      setOrder(data as unknown as OrderRecord);

      if (data.listing_id) {
        const { data: l } = await supabase
          .from('listings')
          .select('id, title, cover_image_url, description, amenities, make, model, category, city, state')
          .eq('id', data.listing_id)
          .maybeSingle();
        if (!cancelled && l) setListing(l as unknown as ListingInfo);
      }

      if (data.sale_transaction_id) {
        const { data: s } = await supabase
          .from('sale_transactions')
          .select(
            'buyer_name, buyer_email, buyer_phone, buyer_address1, buyer_address2, buyer_city, buyer_state, buyer_zip, fulfillment_type, delivery_address, delivery_instructions, shipping_notes, estimated_delivery_date',
          )
          .eq('id', data.sale_transaction_id)
          .maybeSingle();
        if (!cancelled && s) setSale(s as unknown as SaleInfo);
      }

      if (data.booking_request_id) {
        const { data: b } = await supabase
          .from('booking_requests')
          .select(
            'start_date, end_date, start_time, end_time, fulfillment_selected, delivery_address, delivery_instructions, message, status, host_id',
          )
          .eq('id', data.booking_request_id)
          .maybeSingle();
        if (!cancelled && b) setBooking(b as unknown as BookingInfo);
      }

      if (data.seller_id) {
        const { data: p } = await supabase
          .rpc('get_safe_host_profile', { host_user_id: data.seller_id })
          .maybeSingle();
        const row = p as Record<string, any> | null;
        if (!cancelled && row) {
          setSeller({
            name: row.business_name ?? row.display_name ?? row.public_name ?? row.full_name ?? null,
            city: row.city ?? null,
            state: row.state ?? null,
          });
        }
      }

      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [reference]);

  const lines = useMemo(() => toLines(order?.order_items), [order]);
  const lineTotal = lines.reduce((sum, l) => sum + l.unitCents * l.qty, 0);
  const subtotalCents = lineTotal || Math.max(0, (order?.gross_amount_cents ?? 0) - (order?.tax_cents ?? 0));
  const totalCents = order ? order.captured_amount_cents || order.gross_amount_cents : 0;
  const refunded = order?.refunded_cents ?? 0;
  const isHold = order?.payment_intent === 'AUTHORIZE' && order?.payment_status !== 'completed';
  const isPending = order?.payment_status === 'pending';
  /** "Visa ending 4242 (via PayPal)" when PayPal told us the card details. */
  const paymentMethodLabel = (() => {
    const detail = (order?.metadata ?? {}) as any;
    const card = detail?.card ?? detail?.payment_source?.card ?? detail?.paypal?.card;
    const brand = card?.brand ?? card?.card_type;
    const last4 = card?.last_digits ?? card?.last4;
    if (brand || last4) {
      return `${brand ? String(brand).toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase()) : 'Card'}${
        last4 ? ` ending ${last4}` : ''
      } via PayPal`;
    }
    return order?.payment_source === 'card' ? 'Card via PayPal' : 'PayPal';
  })();
  const totalLabel = isPending ? 'Total pending' : isHold ? 'Authorized total' : 'Total paid';

  const issuedAt = order ? new Date(order.captured_at ?? order.created_at) : null;

  const features = (listing?.amenities ?? []).filter(Boolean).slice(0, 8);
  const buyerAddress = sale
    ? [sale.buyer_address1, sale.buyer_address2, [sale.buyer_city, sale.buyer_state].filter(Boolean).join(', '), sale.buyer_zip]
        .filter(Boolean)
        .join(' · ')
    : '';

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Receipt | Vendibook" description="Your Vendibook order receipt." noindex />
      <Header />

      <main className="mx-auto max-w-3xl px-5 pb-24 pt-10 md:pt-14">
        {error || !order ? (
          <div className="rounded-[26px] border border-border/70 bg-card p-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Receipt not found</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{error}</p>
            <Link
              to="/dashboard"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
            >
              Go to dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <article className="rounded-[26px] border border-border/70 bg-card p-7 shadow-[0_40px_120px_-70px_rgba(24,20,16,0.45)] md:p-10">
            {/* Document header */}
            <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border/70 pb-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Vendibook</p>
                <h1 className="mt-1 inline-flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
                  <Receipt className="h-5 w-5 text-muted-foreground" /> Receipt
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {TYPE_LABELS[order.transaction_type] ?? 'Vendibook order'}
                </p>
              </div>
              <dl className="text-right text-xs text-muted-foreground">
                <div><dt className="inline">Receipt no. </dt><dd className="inline font-medium text-foreground">{order.reference}</dd></div>
                {issuedAt ? (
                  <div className="mt-1">
                    <dt className="inline">Date </dt>
                    <dd className="inline text-foreground">
                      {issuedAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                    </dd>
                  </div>
                ) : null}
                <div className="mt-1">
                  <dt className="inline">Status </dt>
                  <dd className="inline text-foreground">
                    {isPending ? 'Pending' : isHold ? 'Authorized (not captured)' : 'Paid'}
                  </dd>
                </div>
                {order.paypal_capture_id ? (
                  <div className="mt-1">
                    <dt className="inline">PayPal transaction id </dt>
                    <dd className="inline font-mono text-[11px] text-foreground">
                      {order.paypal_capture_id}
                    </dd>
                  </div>
                ) : null}
                <div className="mt-1">
                  <dt className="inline">Paid with </dt>
                  <dd className="inline text-foreground">
                    {paymentMethodLabel}
                  </dd>
                </div>
              </dl>
            </header>

            {isPending ? (
              <p className="mt-5 rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                PayPal is still clearing this payment. It is not settled yet — we'll email you the
                moment it does.
              </p>
            ) : isHold ? (
              <p className="mt-5 rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                Funds are authorized and held by PayPal — not captured or charged yet. You are charged
                only when this transaction is confirmed.
              </p>
            ) : null}

            {/* Item */}
            {listing ? (
              <section className="mt-7 flex flex-col gap-4 sm:flex-row">
                {listing.cover_image_url ? (
                  <img
                    src={listing.cover_image_url}
                    alt={listing.title}
                    loading="lazy"
                    className="h-40 w-full rounded-2xl object-cover sm:h-32 sm:w-44"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold text-foreground">{listing.title}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[listing.make, listing.model].filter(Boolean).join(' ')}
                    {listing.city || listing.state ? (
                      <span className="ml-2 inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {[listing.city, listing.state].filter(Boolean).join(', ')}
                      </span>
                    ) : null}
                  </p>
                  {listing.description ? (
                    <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-muted-foreground">
                      {listing.description}
                    </p>
                  ) : null}
                  {features.length ? (
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {features.map((f) => (
                        <li
                          key={f}
                          className="rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground"
                        >
                          {f}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </section>
            ) : null}

            {/* Pricing breakdown */}
            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Price breakdown
              </h2>
              <table className="mt-3 w-full text-sm">
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={`${line.label}-${i}`} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 align-top">
                        <span className="text-foreground">{line.label}</span>
                        {line.detail ? (
                          <span className="block text-xs text-muted-foreground">{line.detail}</span>
                        ) : null}
                      </td>
                      <td className="py-2.5 pr-4 text-right align-top text-xs text-muted-foreground">
                        ×{line.qty}
                      </td>
                      <td className="py-2.5 text-right align-top text-foreground">
                        {usd(line.unitCents * line.qty, order.currency)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-2.5 text-muted-foreground" colSpan={2}>Subtotal</td>
                    <td className="py-2.5 text-right text-foreground">{usd(subtotalCents, order.currency)}</td>
                  </tr>
                  {order.discount_cents > 0 ? (
                    <tr>
                      <td className="py-1 text-muted-foreground" colSpan={2}>Discount</td>
                      <td className="py-1 text-right text-foreground">-{usd(order.discount_cents, order.currency)}</td>
                    </tr>
                  ) : null}
                  <tr>
                    <td className="py-1 text-muted-foreground" colSpan={2}>Sales tax</td>
                    <td className="py-1 text-right text-foreground">{usd(order.tax_cents ?? 0, order.currency)}</td>
                  </tr>
                  {refunded > 0 ? (
                    <tr>
                      <td className="py-1 text-muted-foreground" colSpan={2}>Refunded</td>
                      <td className="py-1 text-right text-foreground">-{usd(refunded, order.currency)}</td>
                    </tr>
                  ) : null}
                  <tr className="border-t border-border/70">
                    <td className="pt-3 font-medium text-foreground" colSpan={2}>
                      {totalLabel}
                    </td>
                    <td className="pt-3 text-right text-xl font-semibold tracking-tight text-foreground">
                      {usd(totalCents, order.currency)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* Parties + fulfillment */}
            <section className="mt-8 grid gap-6 border-t border-border/70 pt-6 sm:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Purchaser</h3>
                <div className="mt-2 space-y-0.5 text-sm text-foreground">
                  {sale?.buyer_name ? <p>{sale.buyer_name}</p> : null}
                  <p className="text-muted-foreground">{sale?.buyer_email ?? order.buyer_email ?? '—'}</p>
                  {sale?.buyer_phone ? <p className="text-muted-foreground">{sale.buyer_phone}</p> : null}
                  {buyerAddress ? <p className="text-muted-foreground">{buyerAddress}</p> : null}
                </div>
              </div>
              {order.seller_id ? (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {booking ? 'Host' : 'Seller'}
                  </h3>
                  <div className="mt-2 space-y-0.5 text-sm text-foreground">
                    <p>{seller?.name ?? (booking ? 'Vendibook host' : 'Vendibook seller')}</p>
                    {seller?.city || seller?.state ? (
                      <p className="text-muted-foreground">{[seller?.city, seller?.state].filter(Boolean).join(', ')}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">Contact details are in your Vendibook messages.</p>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Provider
                  </h3>
                  <div className="mt-2 space-y-0.5 text-sm text-foreground">
                    <p>Vendibook</p>
                    <p className="text-xs text-muted-foreground">
                      Paid to Vendibook through PayPal.
                    </p>
                  </div>
                </div>
              )}

              {booking ? (
                <div className="sm:col-span-2">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Rental details
                  </h3>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <p className="text-foreground">
                      {FULFILLMENT_LABELS[booking.fulfillment_selected ?? ''] ?? 'Arranged with the host'}
                    </p>
                    {booking.start_date ? (
                      <p>
                        Starts:{' '}
                        {new Date(`${booking.start_date}T00:00:00`).toLocaleDateString('en-US', {
                          dateStyle: 'medium',
                        })}
                        {booking.start_time ? ` at ${booking.start_time}` : ''}
                      </p>
                    ) : null}
                    {booking.end_date ? (
                      <p>
                        Ends:{' '}
                        {new Date(`${booking.end_date}T00:00:00`).toLocaleDateString('en-US', {
                          dateStyle: 'medium',
                        })}
                        {booking.end_time ? ` at ${booking.end_time}` : ''}
                      </p>
                    ) : null}
                    {booking.delivery_address ? <p>Delivery address: {booking.delivery_address}</p> : null}
                    {booking.delivery_instructions ? <p>Instructions: {booking.delivery_instructions}</p> : null}
                    {booking.message ? <p>Notes: {booking.message}</p> : null}
                    {booking.status ? <p>Booking status: {booking.status}</p> : null}
                  </div>
                </div>
              ) : null}

              {sale ? (
                <div className="sm:col-span-2">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Fulfillment &amp; delivery notes
                  </h3>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <p className="text-foreground">
                      {FULFILLMENT_LABELS[sale.fulfillment_type ?? ''] ?? 'Arranged with the seller'}
                    </p>
                    {sale.delivery_address ? <p>Delivery address: {sale.delivery_address}</p> : null}
                    {sale.estimated_delivery_date ? (
                      <p>
                        Estimated delivery:{' '}
                        {new Date(sale.estimated_delivery_date).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                      </p>
                    ) : null}
                    {sale.delivery_instructions ? <p>Instructions: {sale.delivery_instructions}</p> : null}
                    {sale.shipping_notes ? <p>Notes: {sale.shipping_notes}</p> : null}
                  </div>
                </div>
              ) : null}
            </section>

            <footer className="mt-8 flex flex-wrap items-center gap-3 border-t border-border/70 pt-6">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/40"
              >
                <Printer className="h-4 w-4" /> Print or save PDF
              </button>
              {order.booking_request_id ? (
                <Link
                  to={`/dashboard/bookings/${order.booking_request_id}`}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  View booking <ArrowRight className="h-4 w-4" />
                </Link>
              ) : order.sale_transaction_id ? (
                <Link
                  to={`/order-tracking/${order.sale_transaction_id}`}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  View order <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  Go to dashboard <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <Link to="/help" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                Need help with this order?
              </Link>
            </footer>
          </article>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default OrderReceipt;
