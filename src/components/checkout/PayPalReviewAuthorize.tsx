import { useEffect, useMemo, useState } from 'react';
import { Loader2, Lock } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { parseEdgeError } from '@/lib/edgeErrors';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

export interface ReviewFunding {
  method: string;
  label: string;
  email: string | null;
  brand: string | null;
  last4: string | null;
}

export interface ReviewData {
  reference: string;
  order_id: string | null;
  record_status: string;
  provider_reason?: string | null;
  order_status: string | null;
  payment_intent: string;
  currency: string;
  amount_cents: number;
  lines: { label: string; amount_cents: number }[];
  funding: ReviewFunding;
  fulfillment: { method: string | null; address: Record<string, any> | null };
  transaction_type: string;
  listing: {
    title: string | null;
    description: string | null;
    image_url: string | null;
    subtitle: string | null;
    location: string | null;
    features: string[];
  } | null;
}

const usd = (cents: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format((cents ?? 0) / 100);

/** Display only the funding source returned by the server's PayPal lookup. */
export function fundingLabel(funding: ReviewFunding): string {
  if (funding.method === 'card') {
    const brand = funding.brand?.trim() || 'Card';
    return funding.last4 && /^\d{4}$/.test(funding.last4)
      ? `${brand} ending ${funding.last4}`
      : brand;
  }
  if (funding.method === 'venmo') return 'Venmo';
  if (funding.method === 'paypal') return 'PayPal';
  return '';
}

interface Props {
  orderId: string;
  /** Which funding button the payer used, when the SDK told us. */
  sourceHint?: string | null;
  /** Called with the payment reference once a capture is verified. */
  onAuthorized: (result: {
    reference?: string;
    status: 'completed' | 'pending';
    message?: string | null;
  }) => void;
  /** Back to the PayPal buttons without losing the order. */
  onChangeMethod: () => void;
  /** Preloaded review payload (skips the initial fetch). */
  initialData?: ReviewData | null;
}

/**
 * Final Review & authorize step. The payer has approved at PayPal, but nothing
 * has been captured: money only moves when they tick the authorization box and
 * press Submit payment here.
 */
const PayPalReviewAuthorize = ({
  orderId,
  sourceHint,
  onAuthorized,
  onChangeMethod,
  initialData = null,
}: Props) => {
  const [data, setData] = useState<ReviewData | null>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState('Payment not completed');

  useEffect(() => {
    if (initialData) return;
    let cancelled = false;
    (async () => {
      const { data: res, error: fnError } = await supabase.functions.invoke('paypal-order-review', {
        body: { order_id: orderId },
      });
      if (cancelled) return;
      setLoading(false);
      if (fnError || !res?.reference) {
        const parsed = await parseEdgeError(fnError, res?.error ? res : null);
        setError(parsed.message || 'We could not load this payment for review. Please try again.');
        return;
      }
      setData(res as ReviewData);
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, initialData]);

  const amount = data ? usd(data.amount_cents, data.currency) : '';
  const method = useMemo(
    () => (data ? fundingLabel(data.funding) : ''),
    [data],
  );
  /**
   * The payer chose a PayPal Pay Later option. PayPal does not return the
   * approved instalment amounts or dates to this integration, so we never
   * display a "due today" instalment figure we cannot verify — we state the
   * order total and say plainly that PayPal sets the schedule.
   */
  const payLater = /pay[-_ ]?later|credit|installment/i.test(sourceHint ?? '');


  const submit = async () => {
    if (!data || !accepted || submitting) return;
    setSubmitting(true);
    setError(null);

    if (data.payment_intent !== 'CAPTURE') {
      setSubmitting(false);
      setError('This payment uses an outdated payment flow. Choose another payment method to restart safely.');
      return;
    }
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('paypal-capture-order', {
        body: { order_id: data.order_id ?? orderId },
      });
      const pending = result?.status === 'pending' || result?.pending === true;
      if (!fnError && (result?.status === 'completed' || pending)) {
        onAuthorized({
          reference: result.reference ?? data.reference,
          status: pending ? 'pending' : 'completed',
          message: result.message ?? null,
        });
        return;
      }

      const parsed = await parseEdgeError(fnError, result?.error ? result : null);
      const reason = result?.provider_reason || result?.message || parsed.message;
      const declined = result?.status === 'declined' ||
        /declin|INSTRUMENT_DECLINED|CARD_REFUSED/i.test(
          [parsed.code, reason, JSON.stringify(parsed.raw?.details ?? [])].join(' '),
        );
      setErrorTitle(declined ? 'Payment declined' : 'Payment not completed');
      setError(reason || 'We could not confirm your payment. Check your transaction status before trying again, or choose another payment method.');
    } catch {
      setErrorTitle('Unable to confirm payment');
      setError('The connection was interrupted. Check your transaction status before trying again; your payment may still be processing.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="paypal-review-skeleton" aria-busy="true" role="status">
        <span className="sr-only">Loading payment review</span>
        <div className="h-6 w-44 rounded-md bg-muted/40 animate-pulse" aria-hidden="true" />
        <div className="h-4 w-72 max-w-full rounded bg-muted/30 animate-pulse" aria-hidden="true" />
        <div className="h-24 rounded-2xl bg-muted/30 animate-pulse" aria-hidden="true" />
        <div className="h-24 rounded-2xl bg-muted/30 animate-pulse" aria-hidden="true" />
        <div className="h-36 rounded-2xl bg-muted/30 animate-pulse" aria-hidden="true" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-3">
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/[0.06] px-4 py-3">
          <p className="text-sm font-semibold text-destructive">We could not load this payment</p>
          <p className="mt-1 text-xs text-destructive/90">{error}</p>
        </div>
        <Button variant="outline" className="w-full" onClick={onChangeMethod}>
          Use a different payment method
        </Button>
      </div>
    );
  }

  const address = data.fulfillment.address as any;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold tracking-tight text-foreground">Review &amp; confirm</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Check the details below, then submit your payment. Your payment status will appear here.
        </p>
      </div>

      {/* What they approved with */}
      <div className="rounded-2xl border border-border/70 bg-muted/25 px-4 py-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {method ? 'Paying with' : 'Payment review'}
        </p>
        {payLater ? (
          <p className="mt-1 text-sm font-semibold text-foreground">PayPal Pay Later</p>
        ) : method ? (
          <p className="mt-1 text-sm font-semibold text-foreground">{method}</p>
        ) : null}
        {method && data.funding.email ? (
          <p className="text-xs text-muted-foreground">{data.funding.email}</p>
        ) : null}
        <p className="mt-2 text-sm text-foreground">
          {payLater ? 'Order total' : 'Amount to be charged'}:{' '}
          <span className="font-semibold">{amount}</span>
        </p>
        {payLater ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            You are not paying {amount} today. PayPal splits this purchase into the instalments
            you approved and bills you on that schedule — the amounts and dates are shown in your
            PayPal account. Vendibook charges the order total to PayPal, not to you directly.
          </p>
        ) : null}
      </div>


      <p className="text-xs text-muted-foreground">
        If you selected Pay in 4 or Pay Monthly in PayPal, your amount due today and future payments follow the plan you approved there. This is the full order total, not an installment amount.
      </p>

      {/* The item */}
      {data.listing ? (
        <div className="flex gap-3 rounded-2xl border border-border/70 p-3">
          {data.listing.image_url ? (
            <img
              src={data.listing.image_url}
              alt={data.listing.title ?? 'Listing'}
              className="h-16 w-20 flex-shrink-0 rounded-xl object-cover"
            />
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{data.listing.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {[data.listing.subtitle, data.listing.location].filter(Boolean).join(' · ')}
            </p>
            {data.listing.description ? (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {data.listing.description}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Real line labels, straight from the order record */}
      <div className="rounded-2xl border border-border/70 px-4 py-3 text-sm">
        {data.lines.map((line, idx) => (
          <div key={`${line.label}-${idx}`} className="flex justify-between py-1 text-muted-foreground">
            <span>{line.label}</span>
            <span className="text-foreground">{usd(line.amount_cents, data.currency)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-border/70 pt-2 font-semibold text-foreground">
          <span>{payLater ? 'Order total (paid to PayPal)' : 'Total'}</span>
          <span>{amount}</span>
        </div>
        {payLater ? (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Your instalment amounts and dates are set by PayPal and shown in your PayPal account.
          </p>
        ) : null}
      </div>


      {(data.fulfillment.method || address) ? (
        <div className="rounded-2xl border border-border/70 px-4 py-3 text-xs text-muted-foreground">
          {data.fulfillment.method ? (
            <p className="text-foreground">
              Fulfillment: <span className="font-medium">{data.fulfillment.method}</span>
            </p>
          ) : null}
          {address ? (
            <p className="mt-1">
              {[address.line1 ?? address.address_line_1, address.city ?? address.admin_area_2,
                address.state ?? address.admin_area_1, address.postal_code]
                .filter(Boolean)
                .join(', ')}
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/[0.06] px-4 py-3">
          <p className="text-sm font-semibold text-destructive">{errorTitle}</p>
          <p className="mt-1 text-xs text-destructive/90">{error}</p>
        </div>
      ) : null}

      <label className="flex cursor-pointer items-start gap-3 text-xs text-muted-foreground">
        <Checkbox
          checked={accepted}
          onCheckedChange={(v) => setAccepted(v === true)}
          aria-label="Accept the Terms of Service and authorize this payment"
          className="mt-0.5"
        />
        <span>
          I accept the{' '}
          <a href="/terms" target="_blank" rel="noreferrer" className="underline">
            Terms of Service
          </a>{' '}
          {payLater
            ? `and authorize this ${amount} purchase, paid to PayPal under the Pay Later plan I approved.`
            : `and authorize this payment of ${amount}.`}

        </span>
      </label>

      <div className="space-y-2.5">
        <Button className="w-full" disabled={!accepted || submitting} onClick={submit}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting payment…
            </>
          ) : (
            <>
              <Lock className="mr-2 h-4 w-4" /> Submit payment
            </>
          )}
        </Button>
        <Button variant="outline" className="w-full" disabled={submitting} onClick={onChangeMethod}>
          Use a different payment method
        </Button>
      </div>
    </div>
  );
};

export default PayPalReviewAuthorize;
