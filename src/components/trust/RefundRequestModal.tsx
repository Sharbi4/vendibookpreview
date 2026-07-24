import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const REASONS = [
  { value: 'not_as_described', label: 'Item not as described' },
  { value: 'never_received', label: 'Never received' },
  { value: 'damaged', label: 'Arrived damaged' },
  { value: 'changed_mind', label: 'Changed my mind' },
  { value: 'other', label: 'Other' },
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  transactionId: string;
  listingId?: string | null;
  orderTotal: number;
  orderLabel?: string;
  onSubmitted?: () => void;
}

/**
 * 3-step refund request modal. Submits a support ticket
 * (category=refund_request) — the ops team reviews and processes the refund.
 */
export function RefundRequestModal({
  open, onOpenChange, transactionId, listingId, orderTotal, orderLabel, onSubmitted,
}: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => { setStep(1); setReason(''); setDetails(''); };

  const handleClose = (v: boolean) => {
    if (busy) return;
    if (!v) reset();
    onOpenChange(v);
  };

  const canContinue = reason && details.trim().length >= 10;

  const handleSubmit = async () => {
    setBusy(true);
    try {
      const reasonLabel = REASONS.find((r) => r.value === reason)?.label ?? reason;
      const { data, error } = await supabase.functions.invoke('submit-support-ticket', {
        body: {
          feature_area: 'purchase',
          category: 'refund_request',
          title: `Refund request: ${reasonLabel}`,
          description: `Reason: ${reasonLabel}\n\n${details}`,
          is_blocking: true,
          related_sale_transaction_id: transactionId,
          related_listing_id: listingId ?? undefined,
          transaction_status: 'refund_requested',
          page_url: typeof window !== 'undefined' ? window.location.href.slice(0, 500) : '',
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Refund request sent — we'll respond within 1 business day", {
        description: (data as any)?.reference_code ? `Reference ${(data as any).reference_code}` : undefined,
      });
      onSubmitted?.();
      handleClose(false);
    } catch (e) {
      toast.error("Couldn't send refund request", {
        description: e instanceof Error ? e.message : 'Please try again in a moment.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Request a refund</DialogTitle>
          <DialogDescription>
            {orderLabel ? `For ${orderLabel}. ` : ''}Our team reviews every refund by hand.
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="refund-reason">Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger id="refund-reason" className="mt-1.5">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="refund-details">What happened?</Label>
              <Textarea
                id="refund-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Give us the details — at least a sentence or two."
                rows={5}
                className="mt-1.5"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Attach photos or receipts by emailing them after you submit.
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
            <div className="flex items-center gap-2 text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="font-medium">You're covered by Payment Protection</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <span className="text-muted-foreground">Order</span>
              <span className="text-right text-foreground">{orderLabel ?? transactionId.slice(0, 8).toUpperCase()}</span>
              <span className="text-muted-foreground">Refund amount (max)</span>
              <span className="text-right font-medium text-foreground">${orderTotal.toFixed(2)}</span>
              <span className="text-muted-foreground">Reason</span>
              <span className="text-right text-foreground">{REASONS.find((r) => r.value === reason)?.label}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              We respond within one business day. If approved, refunds settle to your original payment method within 5–10 days.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 2 && (
            <Button variant="ghost" onClick={() => setStep(1)} disabled={busy}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          )}
          <Button variant="outline" onClick={() => handleClose(false)} disabled={busy}>
            Not now
          </Button>
          {step === 1 ? (
            <Button onClick={() => setStep(2)} disabled={!canContinue}>Review request</Button>
          ) : (
            <Button onClick={handleSubmit} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send refund request
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RefundRequestModal;
