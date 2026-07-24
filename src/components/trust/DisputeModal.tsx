import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ShieldAlert, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  transactionId: string;
  role: 'buyer' | 'seller';
  onSubmitted?: () => void;
}

/**
 * 3-step guided dispute. Calls raise-dispute edge function.
 * Copy uses "payment protection" language, never "escrow".
 */
export function DisputeModal({ open, onOpenChange, transactionId, role, onSubmitted }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => { setStep(1); setReason(''); setEvidence(''); };

  const handleClose = (v: boolean) => {
    if (busy) return;
    if (!v) reset();
    onOpenChange(v);
  };

  const combinedReason = evidence.trim()
    ? `${reason.trim()}\n\nEvidence / additional notes:\n${evidence.trim()}`
    : reason.trim();

  const canGoto2 = reason.trim().length >= 10;

  const handleSubmit = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('raise-dispute', {
        body: { transaction_id: transactionId, reason: combinedReason },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success('Dispute submitted', {
        description: 'Payment is paused while our team reviews. We respond within 3–5 business days.',
      });
      onSubmitted?.();
      handleClose(false);
    } catch (e) {
      toast.error("Couldn't open dispute", {
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
          <DialogTitle>
            {role === 'buyer' ? 'Open a dispute' : 'Respond to dispute'}
          </DialogTitle>
          <DialogDescription>
            Step {step} of 3 — {step === 1 ? 'what went wrong' : step === 2 ? 'evidence' : 'review & submit'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-3">
            <Label htmlFor="dispute-reason">Explain what happened</Label>
            <Textarea
              id="dispute-reason"
              rows={5}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the problem in detail. Include dates and any communication with the other party."
            />
            <p className="text-xs text-muted-foreground">Minimum 10 characters.</p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <Label htmlFor="dispute-evidence">Evidence (optional)</Label>
            <Textarea
              id="dispute-evidence"
              rows={5}
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="Paste tracking numbers, links to photos, or key details. Email additional files to support@vendibook.com referencing this order."
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
            <div className="flex items-center gap-2 text-foreground">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              <span className="font-medium">Payment protection stays in place</span>
            </div>
            <p className="text-xs text-muted-foreground">
              When you submit, we pause any pending fund release and notify the other party. You'll see a live status timeline (Opened → Under review → Resolved).
            </p>
            <div className="rounded-md bg-background/60 p-3 text-xs text-foreground/90 whitespace-pre-wrap max-h-40 overflow-auto">
              {combinedReason}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 1 && (
            <Button variant="ghost" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)} disabled={busy}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          )}
          <Button variant="outline" onClick={() => handleClose(false)} disabled={busy}>
            Cancel
          </Button>
          {step < 3 ? (
            <Button
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
              disabled={step === 1 && !canGoto2}
            >
              Continue
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit dispute
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DisputeModal;
