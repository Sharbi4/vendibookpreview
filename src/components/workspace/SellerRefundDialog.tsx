import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

/**
 * Seller-initiated refund on their own order.
 *
 * The refund is always issued through PayPal by the server — nothing here
 * changes a status on its own. Failures (most commonly a PayPal balance that
 * can't cover the refund) are shown with the exact recovery step so the seller
 * can fix it and retry.
 */

interface Props {
  paymentRecordId: string;
  reference: string | null;
  currency?: string | null;
  /** Amount still refundable, in cents. */
  refundableCents: number;
  onRefunded?: () => void;
}

const money = (cents: number, currency = 'USD') =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency });

export default function SellerRefundDialog({
  paymentRecordId,
  reference,
  currency,
  refundableCents,
  onRefunded,
}: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState((refundableCents / 100).toFixed(2));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (refundableCents <= 0) return null;

  const submit = async () => {
    setError(null);
    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0 || cents > refundableCents) {
      setError(`Enter an amount between $0.01 and ${money(refundableCents, currency ?? 'USD')}.`);
      return;
    }
    setBusy(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('paypal-refund', {
        body: { payment_record_id: paymentRecordId, amount_cents: cents, reason: reason || undefined },
      });
      // Edge errors arrive with the readable message in the response body.
      if (fnError) {
        let message = 'We couldn\u2019t reach PayPal. Nothing was refunded — please try again.';
        try {
          const ctx = (fnError as any).context;
          const body = ctx && typeof ctx.json === 'function' ? await ctx.json() : null;
          if (body?.message) message = body.message;
          else if (body?.error) message = body.error;
        } catch {
          /* keep the generic message */
        }
        setError(message);
        return;
      }
      if (!data?.success) {
        setError(data?.message ?? 'PayPal did not confirm the refund. Nothing was changed.');
        return;
      }
      toast.success(`Refund of ${money(data.refunded_cents ?? cents, currency ?? 'USD')} sent.`);
      setOpen(false);
      onRefunded?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Refund
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Refund this order</DialogTitle>
          <DialogDescription>
            {reference ? `Order ${reference}. ` : ''}
            Up to {money(refundableCents, currency ?? 'USD')} can be refunded through PayPal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="refund-amount">Amount</Label>
            <Input
              id="refund-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-base"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="refund-reason">Reason (optional)</Label>
            <Textarea
              id="refund-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Shared with the buyer's records."
              className="text-base"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Vendibook&apos;s commission is recalculated on the amount the buyer keeps, so a full
            refund returns the full commission.
          </p>
          {error ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send refund'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
