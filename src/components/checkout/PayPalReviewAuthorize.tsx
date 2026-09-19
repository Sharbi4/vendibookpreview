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

/**
 * Plain-language name for what the payer actually approved with. The SDK tells
 * us which funding button was used (PayPal / Venmo / Pay Later / card); PayPal
 * itself reports the card brand and last four when a card was used.
 */
export function fundingLabel(funding: ReviewFunding, hint?: string | null): string {
  if (funding.method === 'card') return funding.label;
  if (funding.method === 'venmo') return funding.label;
  if (hint === 'paylater') return 'PayPal Pay Later';
  if (hint === 'venmo') return 'Venmo';
  if (hint === 'card') return funding.label;
  return 'PayPal balance or linked funding';
}

interface Props {
  orderId: string;
  /** Which funding button the payer used, when the SDK told us. */
  sourceHint?: string | null;
  /** Called with the payment reference once a capture is verified. */
  onAuthorized: (result: {
    reference?: string;
    status: 'completed' | 'authorized' | 'pending';
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
    () => (data ? fundingLabel(data.funding, sourceHint) : ''),
    [data, sourceHint],
  );

  const submit = async () => {
    if (!data || !accepted || submitting) return;
    setSubmitting(true);
    setError(null);

    const authorizeFlow = data.payment_intent === 'AUTHORIZE';
    const fn = authorizeFlow ? 'paypal-authorize-order' : 'paypal-capture-order';
    const { data: result, error: fnError } = await supabase.functions.invoke(fn, {
      body: { order_id: data.order_id ?? orderId },
    });
    setSubmitting(false);

    if (fnError || !result || (result.status !== 'completed' && result.status !== 'authorized' && !result.pending)) {
      const parsed = await parseEdgeError(fnError, result?.error ? result : null);
      setError(
        parsed.message ||
          'Your payment was not completed and nothing has been charged. You can approve again or use another method.',
      );
      return;
    }

    onAuthorized({
      reference: result.reference ?? data.reference,
      status: result.status === 'authorized'
        ? 'authorized'
        : result.pending
          ? 'pending'
          : 'completed',
      message: result.message ?? null,
    });
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
        <h3 className="text-lg font-semibold tracking-tight text-foreground">Review &amp; authorize</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Nothing has been charged yet. Check the details below, then submit your payment.
        </p>
      </div>

      {/* What they approved with */}
      <div className="rounded-2xl border border-border/70 bg-muted/25 px-4 py-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Paying with
        </p>
        <p className="mt-1 text-sm font-semibold text-foreground">{method}</p>
        {data.funding.email ? (
          <p className="text-xs text-muted-foreground">{data.funding.email}</p>
        ) : null}
        <p className="mt-2 text-sm text-foreground">
          Amount to be charged: <span className="font-semibold">{amount}</span>
        </p>
      </div>

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
          <span>Total</span>
          <span>{amount}</span>
        </div>
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
          <p className="text-sm font-semibold text-destructive">Payment not completed</p>
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
          and authorize this payment of {amount}.
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
