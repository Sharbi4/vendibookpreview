import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Circle, Clock3, FileSignature, Loader2, LifeBuoy, RefreshCw, SearchCheck, Truck, Video } from 'lucide-react';
import { useOrderDetail, recoverOrderPayment } from '@/hooks/useOrderDetail';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import SEO from '@/components/SEO';
import OrderEvidenceSection from '@/components/handoff/OrderEvidenceSection';
import DeliveryTrackingPanel from '@/components/delivery/DeliveryTrackingPanel';
import PayPalPaymentFacts from '@/components/checkout/PayPalPaymentFacts';
import OrderCaseSection from '@/components/disputes/OrderCaseSection';
import { DocumentsCard } from '@/components/documents/DocumentsCard';



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
  const deadline = order.release?.deadline_at ? new Date(order.release.deadline_at) : null;
  const msLeft = deadline ? deadline.getTime() - Date.now() : null;
  const daysRemaining = msLeft != null ? Math.max(0, Math.ceil(msLeft / 86_400_000)) : null;
  const hoursRemaining = msLeft != null ? Math.max(0, Math.ceil(msLeft / 3_600_000)) : null;
  const countdownLabel =
    msLeft == null ? null
      : msLeft <= 0 ? 'Deadline passed'
        : hoursRemaining != null && hoursRemaining <= 24 ? `${hoursRemaining} hour${hoursRemaining === 1 ? '' : 's'} left`
          : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`;

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
          {order.release && (
            <Card className="border-primary/25 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Seller payment checklist
                  </h2>
                  <p className="mt-2 text-sm text-foreground">
                    The seller can be approved for payment after both items below are complete.
                  </p>
                </div>
                {deadline && !order.release.conditions_completed_at && (
                  <Badge
                    variant="outline"
                    className={`gap-1.5 ${msLeft != null && msLeft <= 0
                      ? 'border-destructive/40 text-destructive'
                      : msLeft != null && msLeft <= 3 * 86_400_000
                        ? 'border-amber-500/40 text-amber-600'
                        : ''}`}
                  >
                    <Clock3 className="h-3.5 w-3.5" /> {countdownLabel}
                  </Badge>
                )}
              </div>
              <div className="mt-5 space-y-4">
                <ReleaseCondition
                  complete={order.release.walkthrough_complete}
                  icon={Video}
                  title="Walkthrough video saved"
                  detail={order.release.walkthrough_recorded_at
                    ? `Completed ${new Date(order.release.walkthrough_recorded_at).toLocaleString()}`
                    : 'Waiting for a walkthrough video to be saved to the transaction evidence.'}
                />
                <ReleaseCondition
                  complete={order.release.agreement_complete}
                  icon={FileSignature}
                  title="Purchase agreement signed by both parties"
                  detail={order.release.agreement_completed_at
                    ? `Completed ${new Date(order.release.agreement_completed_at).toLocaleString()}`
                    : 'Waiting for both buyer and seller signatures through SignNow.'}
                />
              </div>
              {deadline && !order.release.conditions_completed_at && (
                <div className="mt-5 space-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
                  <p>Deadline: {deadline.toLocaleString()}.</p>
                  <p>
                    {msLeft != null && msLeft <= 0
                      ? 'The deadline has passed. A Vendibook administrator will review this order and can cancel it and refund the buyer in full.'
                      : 'If the checklist is still incomplete at the deadline, a Vendibook administrator can cancel the order and refund the buyer in full.'}
                  </p>
                  <p>
                    Both the buyer and the seller get a daily reminder by email until the checklist is
                    complete. If a Vendibook case is opened on this order, the countdown pauses and the
                    remaining time resumes when the case closes without a refund.
                  </p>
                </div>
              )}
            </Card>
          )}

          {(order as any).links?.sale_transaction_id && (
            <DocumentsCard
              scope={{ transaction_id: String((order as any).links.sale_transaction_id) }}
              title="Purchase agreement"
            />
          )}



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

          {order.viewer_role === 'buyer' && order.transaction_type === 'sale' && order.fulfillment.type === 'equipment_pickup' && (
            <Card className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <SearchCheck className="mt-0.5 h-5 w-5 text-primary" aria-hidden />
                <div>
                  <p className="font-medium">Prepare for your meetup</p>
                  <p className="text-sm text-muted-foreground">Review the equipment and document its condition before completing the handoff.</p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to={`/guides/meetup-inspection?returnTo=${encodeURIComponent(`/orders/${order.id}`)}`}>Open Meetup &amp; Inspection Guide</Link>
              </Button>
            </Card>
          )}

          <DeliveryTrackingPanel
            saleTransactionId={(order as any).links?.sale_transaction_id ?? null}
            bookingId={(order as any).links?.booking_request_id ?? null}
            fulfillmentType={order.fulfillment.type}
          />

          {order.viewer_role !== 'buyer' && ['rental_delivery','equipment_delivery','shipping'].includes(order.fulfillment.type) && (
            <Card className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <div>
                <p className="font-medium">Delivering this order yourself?</p>
                <p className="text-sm text-muted-foreground">
                  Open Delivery mode to share live location with the buyer while you're on the road.
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link
                  to={`/delivery/${(order as any).links?.sale_transaction_id ? 'sale' : 'booking'}/${
                    (order as any).links?.sale_transaction_id ?? (order as any).links?.booking_request_id
                  }`}
                >
                  <Truck className="mr-2 h-4 w-4" /> Open delivery mode
                </Link>
              </Button>
            </Card>
          )}


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
          {order.settlement && (
            <Card className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Settlement
                </h2>
                <Badge variant="outline" className={toneClass[order.settlement.status_tone]}>
                  {order.settlement.status_label}
                </Badge>
              </div>
              <dl className="mt-3 space-y-2 text-sm">
                <Line
                  label="Buyer paid"
                  value={money(order.settlement.gross_collected_cents, order.settlement.currency)}
                />
                <Line
                  label={`Vendibook fee${order.settlement.fee_rate_pct ? ` (${order.settlement.fee_rate_pct}%)` : ''}`}
                  value={`− ${money(order.settlement.platform_fee_cents, order.settlement.currency)}`}
                />
                {order.settlement.pro_discount_cents > 0 && (
                  <Line
                    label="Vendibook Pro savings"
                    value={`+ ${money(order.settlement.pro_discount_cents, order.settlement.currency)}`}
                  />
                )}
                {order.settlement.adjustments_cents !== 0 && (
                  <Line
                    label="Adjustments"
                    value={money(order.settlement.adjustments_cents, order.settlement.currency)}
                  />
                )}
                {order.settlement.refunded_cents > 0 && (
                  <Line
                    label="Refunded to buyer"
                    value={`− ${money(order.settlement.refunded_cents, order.settlement.currency)}`}
                  />
                )}
                <Separator className="my-2" />
                <Line
                  label="Your proceeds"
                  value={money(order.settlement.net_to_seller_cents, order.settlement.currency)}
                  strong
                />
                {order.settlement.settled_at && (
                  <Line
                    label={order.settlement.status_code === 'payout_completed' ? 'Settled on' : 'Payment received'}
                    value={new Date(order.settlement.settled_at).toLocaleDateString()}
                  />
                )}
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">
                {order.settlement.status_description}
              </p>
              {order.settlement.hold_reason && (
                <p className="mt-2 text-xs text-muted-foreground">{order.settlement.hold_reason}</p>
              )}
              {order.settlement.routed_to_connected_paypal && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Paid through your connected PayPal Business account.
                </p>
              )}
            </Card>
          )}

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
            <PayPalPaymentFacts
              saleTransactionId={(order as any).links?.sale_transaction_id ?? null}
              bookingRequestId={(order as any).links?.booking_request_id ?? null}
              className="mt-4 rounded-xl border border-border bg-muted/20 p-4 text-left"
            />
          </Card>

          <OrderCaseSection
            orderId={order.id}
            viewerRole={order.viewer_role}
            canReport={order.viewer_role !== 'admin'}
          />

          <OrderEvidenceSection
            saleTransactionId={(order as any).links?.sale_transaction_id ?? null}
            bookingId={(order as any).links?.booking_request_id ?? null}
          />

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

const ReleaseCondition = ({ complete, icon: Icon, title, detail }: {
  complete: boolean;
  icon: typeof Video;
  title: string;
  detail: string;
}) => (
  <div className="flex gap-3">
    <span className="relative mt-0.5 text-primary">
      {complete ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
      <Icon className="sr-only" aria-hidden="true" />
    </span>
    <div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  </div>
);

export default OrderDetailPage;
