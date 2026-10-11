import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Loader2, MessageSquare, ShieldCheck } from 'lucide-react';
import Header from '@/components/layout/Header';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import ConciergeIntakeForm from '@/components/concierge/ConciergeIntakeForm';
import PayPalPaymentPanel from '@/components/checkout/PayPalPaymentPanel';
import {
  answerConciergeQuestion,
  approveConciergePublication,
  CONCIERGE_STATUS_COPY,
  type ConciergeConfig,
  type ConciergeMessage,
  type ConciergeOrder as Order,
  getConciergeOrder,
  requestConciergeRevision,
} from '@/lib/concierge/api';
import { formatUsd } from '@/lib/monetization/products';

const APPROVAL_STATEMENTS = [
  'I own this item or have authority to list it.',
  'The information in this listing is accurate to the best of my knowledge.',
  'The condition and any known problems are disclosed honestly.',
  'I agree to the VendiBook marketplace rules.',
  'I consent to signing this approval electronically.',
];

/** Seller workspace for one Listing Concierge order — resumable on any device. */
const ConciergeOrderPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [config, setConfig] = useState<ConciergeConfig | null>(null);
  const [messages, setMessages] = useState<ConciergeMessage[]>([]);
  const [humanReviewed, setHumanReviewed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [payOpen, setPayOpen] = useState(false);
  const [reply, setReply] = useState('');
  const [revisionNote, setRevisionNote] = useState('');
  const [approvals, setApprovals] = useState<boolean[]>(APPROVAL_STATEMENTS.map(() => false));
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) return;
    try {
      const data = await getConciergeOrder(orderId);
      setOrder(data.order);
      setConfig(data.config);
      setMessages(data.messages);
      setHumanReviewed(data.human_reviewed);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load this order.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order || !config) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold">We couldn’t find that order</h1>
        <Button className="mt-6" onClick={() => navigate('/dashboard')}>Back to dashboard</Button>
      </div>
    );
  }

  const statusCopy = CONCIERGE_STATUS_COPY[order.status];
  const unpaid = order.payment_status !== 'paid';
  const canRevise = (order.revision_count ?? 0) < (order.revisions_included ?? 1);

  const run = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(success);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Listing Concierge order | VendiBook" description="Your VendiBook Listing Concierge order." noindex />
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-24 sm:pt-28">
        <Badge variant="secondary" className="mb-3">Listing Concierge</Badge>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{statusCopy.label}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{statusCopy.next}</p>

        {humanReviewed && (
          <p className="mt-3 flex items-center gap-2 text-sm text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Reviewed by a VendiBook specialist.
          </p>
        )}

        {unpaid && (
          <div className="mt-8 rounded-2xl border border-border/60 bg-card/60 p-6">
            <p className="text-sm text-muted-foreground">Amount due</p>
            <p className="text-2xl font-semibold text-foreground">{formatUsd(order.price_cents)}</p>
            <Button className="mt-4" onClick={() => setPayOpen(true)}>
              {order.status === 'payment_required' && order.intake_version > 1
                ? 'Try payment again'
                : 'Pay securely with PayPal'}
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              Your order is saved. If a payment fails or you cancel, nothing is lost — come back here anytime.
            </p>
          </div>
        )}

        {!unpaid && ['intake_not_started', 'intake_in_progress', 'information_needed'].includes(order.status) && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-foreground">Tell us about your equipment</h2>
            <p className="mb-6 mt-1 text-sm text-muted-foreground">
              “Not sure” is a fine answer to anything. Your {config.turnaround_business_days} business
              day estimate starts once this is complete.
            </p>
            <ConciergeIntakeForm
              order={order}
              config={config}
              userId={user?.id ?? ''}
              onSaved={(o) => setOrder(o)}
            />
          </section>
        )}

        {messages.length > 0 && (
          <section className="mt-10 space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <MessageSquare className="h-4 w-4" /> Messages
            </h2>
            {messages.map((m) => (
              <div key={m.id} className="rounded-xl border border-border/60 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {m.author_role === 'admin' ? 'VendiBook' : 'You'}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{m.body}</p>
              </div>
            ))}
            {order.status === 'information_needed' && (
              <div className="space-y-3">
                <Textarea
                  rows={3}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type your answer"
                />
                <Button
                  disabled={busy || !reply.trim()}
                  onClick={() => run(() => answerConciergeQuestion(order.id, reply), 'Answer sent.')}
                >
                  Send answer
                </Button>
              </div>
            )}
          </section>
        )}

        {order.status === 'ready_for_seller_review' && (
          <section className="mt-10 space-y-6">
            <div className="rounded-2xl border border-border/60 bg-card/60 p-6">
              <h2 className="text-lg font-semibold text-foreground">Your draft is ready</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Review every detail before approving. Nothing is public until you approve.
              </p>
              {order.listing_id && (
                <Button variant="outline" className="mt-4" asChild>
                  <Link to={`/edit-listing/${order.listing_id}`}>Open the full draft</Link>
                </Button>
              )}
            </div>

            <div className="rounded-2xl border border-border/60 p-6">
              <h3 className="text-sm font-semibold text-foreground">Approve and publish</h3>
              <div className="mt-4 space-y-3">
                {APPROVAL_STATEMENTS.map((text, i) => (
                  <label key={text} className="flex items-start gap-3 text-sm text-foreground">
                    <Checkbox
                      checked={approvals[i]}
                      onCheckedChange={(c) =>
                        setApprovals((s) => s.map((v, idx) => (idx === i ? c === true : v)))}
                    />
                    {text}
                  </label>
                ))}
              </div>
              <Button
                className="mt-5"
                disabled={busy || approvals.some((v) => !v)}
                onClick={() =>
                  run(async () => {
                    const res = await approveConciergePublication(order.id);
                    navigate(`/listing-published/${res.listing_id}`);
                  }, 'Your listing is live.')}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve and publish
              </Button>
            </div>

            <div className="rounded-2xl border border-border/60 p-6">
              <h3 className="text-sm font-semibold text-foreground">Request your included revision</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {canRevise
                  ? `${(order.revisions_included ?? 1) - (order.revision_count ?? 0)} revision remaining.`
                  : 'You have used your included revision. Message us if you still need help.'}
              </p>
              {canRevise && (
                <>
                  <Textarea
                    rows={3}
                    className="mt-3"
                    value={revisionNote}
                    onChange={(e) => setRevisionNote(e.target.value)}
                    placeholder="What would you like changed?"
                  />
                  <Button
                    variant="outline"
                    className="mt-3"
                    disabled={busy || !revisionNote.trim()}
                    onClick={() =>
                      run(() => requestConciergeRevision(order.id, revisionNote), 'Revision requested.')}
                  >
                    Request revision
                  </Button>
                </>
              )}
            </div>
          </section>
        )}

        <p className="mt-12 text-xs leading-relaxed text-muted-foreground">
          The Listing Concierge is a listing preparation service. VendiBook does not guarantee a
          sale, a rental, a specific price, buyer interest, or any particular timeline.
        </p>
      </main>

      {payOpen && (
        <PayPalPaymentPanel
          target={{ kind: 'concierge', id: order.id }}
          totalUsd={order.price_cents / 100}
          onClose={() => setPayOpen(false)}
          onSuccess={async () => {
            setPayOpen(false);
            await load();
            toast.success('Payment received — let’s get your details.');
          }}
          summary={
            <div className="space-y-1">
              <p className="text-sm font-medium">VendiBook Listing Concierge</p>
              <p className="text-lg font-semibold">{formatUsd(order.price_cents)}</p>
            </div>
          }
        />
      )}
    </div>
  );
};

export default ConciergeOrderPage;
