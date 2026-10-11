import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * The four payment facts PayPal requires on a confirmation page:
 * payment source used, the buyer's PayPal email when PayPal was used, the
 * shipping address when one was used, and the billing address when one was
 * used.
 *
 * Every value is read from what the capture response actually returned and
 * stored on the payment record — nothing here is assumed. A field that PayPal
 * did not return is simply not rendered.
 */

type Props = {
  /** Any one of these identifies the payment record. */
  reference?: string | null;
  saleTransactionId?: string | null;
  bookingRequestId?: string | null;
  paymentRecordId?: string | null;
  className?: string;
};

interface Facts {
  payment_source: string | null;
  payer_email: string | null;
  shipping_address: Record<string, unknown> | null;
  billing_address: Record<string, unknown> | null;
  currency: string | null;
}

/** PayPal wallet keys → the name the buyer recognises. */
const SOURCE_LABELS: Record<string, string> = {
  paypal: 'PayPal',
  venmo: 'Venmo',
  card: 'Debit or credit card',
  apple_pay: 'Apple Pay',
  google_pay: 'Google Pay',
  bancontact: 'Bancontact',
  blik: 'BLIK',
  eps: 'EPS',
  ideal: 'iDEAL',
  paylater: 'PayPal Pay Later',
};

function labelForSource(source: string | null): string | null {
  if (!source) return null;
  return SOURCE_LABELS[source] ?? source.replace(/_/g, ' ');
}

function formatAddress(address: Record<string, unknown> | null): string[] | null {
  if (!address) return null;
  const get = (k: string) => {
    const v = address[k];
    return typeof v === 'string' && v.trim() ? v.trim() : null;
  };
  const lines = [
    get('name'),
    get('address_line_1'),
    get('address_line_2'),
    [get('admin_area_2'), get('admin_area_1'), get('postal_code')].filter(Boolean).join(', '),
    get('country_code'),
  ].filter((l): l is string => !!l && l !== '');
  return lines.length ? lines : null;
}

const PayPalPaymentFacts = ({
  reference,
  saleTransactionId,
  bookingRequestId,
  paymentRecordId,
  className,
}: Props) => {
  const [facts, setFacts] = useState<Facts | null>(null);

  useEffect(() => {
    let cancelled = false;
    const key = paymentRecordId ?? reference ?? saleTransactionId ?? bookingRequestId;
    if (!key) return;

    (async () => {
      let query = supabase
        .from('payment_records')
        .select('payment_source, payer_email, shipping_address, billing_address, currency')
        .eq('payment_status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1);

      if (paymentRecordId) query = query.eq('id', paymentRecordId);
      else if (reference) query = query.eq('reference', reference);
      else if (saleTransactionId) query = query.eq('sale_transaction_id', saleTransactionId);
      else if (bookingRequestId) query = query.eq('booking_request_id', bookingRequestId);

      const { data } = await query.maybeSingle();
      if (!cancelled && data) setFacts(data as unknown as Facts);
    })();

    return () => {
      cancelled = true;
    };
  }, [reference, saleTransactionId, bookingRequestId, paymentRecordId]);

  if (!facts) return null;

  const source = labelForSource(facts.payment_source);
  const shipping = formatAddress(facts.shipping_address);
  const billing = formatAddress(facts.billing_address);
  if (!source && !facts.payer_email && !shipping && !billing) return null;

  return (
    <div className={className ?? 'rounded-xl border border-border bg-muted/20 p-4 text-left'}>
      <p className="text-sm font-semibold text-foreground">Payment details</p>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
        {source ? (
          <div>
            <dt className="text-muted-foreground">Paid with</dt>
            <dd className="text-foreground font-medium">{source}</dd>
          </div>
        ) : null}
        {facts.payer_email ? (
          <div>
            <dt className="text-muted-foreground">
              {facts.payment_source === 'venmo' ? 'Venmo account' : 'PayPal account'}
            </dt>
            <dd className="text-foreground font-medium break-all">{facts.payer_email}</dd>
          </div>
        ) : null}
        {shipping ? (
          <div>
            <dt className="text-muted-foreground">Shipping address</dt>
            <dd className="text-foreground">
              {shipping.map((line) => <div key={line}>{line}</div>)}
            </dd>
          </div>
        ) : null}
        {billing ? (
          <div>
            <dt className="text-muted-foreground">Billing address</dt>
            <dd className="text-foreground">
              {billing.map((line) => <div key={line}>{line}</div>)}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
};

export default PayPalPaymentFacts;
