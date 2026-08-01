import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Loader2, LifeBuoy, RefreshCw } from 'lucide-react';
import { useOrderDetail, recoverOrderPayment } from '@/hooks/useOrderDetail';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import SEO from '@/components/SEO';

const money = (cents: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format((cents ?? 0) / 100);

const toneClass: Record<string, string> = {
  positive: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
  critical: 'bg-destructive/10 text-destructive border-destructive/30',
  neutral: 'bg-muted text-muted-foreground border-border',
};

const OrderDetailPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading, error, refetch } = useOrderDetail(orderId);
  const [working, setWorking] = useState<string | null>(null);

  const run = async (action: 'status' | 'retry') => {
    if (!orderId || working) return;
    setWorking(action === 'retry' ? 'Retrying secure payment…' : 'Checking payment status…');
    try {
      const result = await recoverOrderPayment(orderId, action);
      toast[(result as any)?.payable ? 'info' : 'success'](
        String((result as any)?.message ?? (result as any)?.error ?? 'Payment status updated.'),
      );
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'We could not reach the payment service.');
    } finally {
      setWorking(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">Order unavailable</h1>
        <p className="mt-2 text-muted-foreground">
          We couldn't load this order. It may belong to another account.
        </p>
        <Button className="mt-6" onClick={() => navigate('/dashboard')}>Back to dashboard</Button>
      </div>
    );
  }

  const a = order.amounts;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:py-14">
      <SEO
        title={`Order ${order.order_number} · Vendibook`}
        description="View your Vendibook order status, payment details, and next steps."
        noindex
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Order</p>
          <h1 className="text-2xl font-semibold sm:text-3xl">{order.order_number}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(order.created_at).toLocaleString()} · {order.transaction_type_label}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant="outline" className={toneClass[order.payment.tone]}>
            {order.payment.label}
          </Badge>
          <Badge variant="outline">{order.order_status.label}</Badge>
        </div>
      </div>

      {/* Next action */}
      <Card className="mt-6 border-primary/25 bg-primary/5 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
          <div className="flex-1">
            <p className="font-medium">{order.next_action.next_action_title}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {order.next_action.next_action_description}
            </p>
          </div>
        </div>
        {(order.payment.is_payable || order.next_action.next_action_code === 'retry_payment') && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" disabled={!!working} onClick={() => run('retry')}>
              {working ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {working ?? 'Retry payment'}
            </Button>
            <Button size="sm" variant="outline" disabled={!!working} onClick={() => run('status')}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Check payment status
            </Button>
          </div>
        )}
      </Card>

      <p className="mt-3 text-sm text-muted-foreground">{order.payment.description}</p>

      <div className="mt-8 grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {order.listing && (
            <Card className="flex items-center gap-4 p-4">
              {order.listing.image_url && (
                <img
                  src={order.listing.image_url}
                  alt={order.listing.title ?? 'Listing'}
                  loading="lazy"
                  className="h-16 w-24 rounded-lg object-cover"
                />
              )}
              <div>
                <p className="font-medium">{order.listing.title}</p>
                {order.counterparty_name && (
                  <p className="text-sm text-muted-foreground">{order.counterparty_name}</p>
                )}
              </div>
            </Card>
          )}

          <Card className="p-4 sm:p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Fulfillment · {order.fulfillment.label}
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              {Object.entries(order.fulfillment.details)
                .filter(([, v]) => v !== null && v !== undefined && v !== '')
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{k.replace(/_/g, ' ')}</dt>
                    <dd className="text-right">{String(v)}</dd>
                  </div>
                ))}
              {Object.keys(order.fulfillment.details).length === 0 && (
                <p className="text-muted-foreground">Details will appear here as this order progresses.</p>
              )}
            </dl>
          </Card>

          <Card className="p-4 sm:p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Timeline
            </h2>
            <ol className="mt-4 space-y-4">
              {order.timeline.length === 0 && (
                <p className="text-sm text-muted-foreground">No events recorded yet.</p>
              )}
              {order.timeline.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="text-sm font-medium">{e.title}</p>
                    {e.description && (
                      <p className="text-sm text-muted-foreground">{e.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-4 sm:p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Payment
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Line label="Gross" value={money(a.gross_cents, a.currency)} />
              {a.tax_cents > 0 && <Line label="Taxes" value={money(a.tax_cents, a.currency)} />}
              {a.fee_cents > 0 && <Line label="Service fee" value={money(a.fee_cents, a.currency)} />}
              {a.refunded_cents > 0 && (
                <Line label="Refunded" value={`− ${money(a.refunded_cents, a.currency)}`} />
              )}
              <Separator className="my-2" />
              <Line label="Total paid" value={money(a.total_paid_cents, a.currency)} strong />
              {order.payment.payment_method_label && (
                <Line label="Method" value={order.payment.payment_method_label} />
              )}
              {order.payment.paypal_order_id && (
                <Line label="PayPal order ID" value={order.payment.paypal_order_id} mono />
              )}
              {order.payment.paypal_capture_id && (
                <Line label="PayPal capture ID" value={order.payment.paypal_capture_id} mono />
              )}
              <Line label="Transaction ID" value={order.id} mono />
            </dl>
          </Card>

          <Card className="p-4 sm:p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Support
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Questions or a problem with this order? Our team can help.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link to={order.support.dispute_url}>
                <LifeBuoy className="mr-2 h-4 w-4" />
                Contact support
              </Link>
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              Your payment was processed securely through PayPal. Fulfillment and seller payment are
              managed according to the applicable Vendibook transaction terms.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

const Line = ({ label, value, strong, mono }: {
  label: string; value: string; strong?: boolean; mono?: boolean;
}) => (
  <div className="flex justify-between gap-4">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className={`text-right ${strong ? 'font-semibold' : ''} ${mono ? 'font-mono text-xs break-all' : ''}`}>
      {value}
    </dd>
  </div>
);

export default OrderDetailPage;
