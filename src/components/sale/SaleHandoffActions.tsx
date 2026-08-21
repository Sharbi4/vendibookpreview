import { useState } from 'react';
import { Loader2, ArrowRight, CheckCircle2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { HandoffNextStep, HandoffRole } from '@/lib/sale/handoff';

interface Props {
  transactionId: string;
  role: HandoffRole;
  step: HandoffNextStep;
  onMessage: () => void;
  onDone: () => void;
}

/**
 * Renders the single primary action for the current handoff step.
 * Confirmations go through the existing `confirm-sale` function; seller
 * fulfillment milestones go through `sale-fulfillment-update`.
 */
export const SaleHandoffActions = ({ transactionId, role, step, onMessage, onDone }: Props) => {
  const [busy, setBusy] = useState(false);
  const [shipOpen, setShipOpen] = useState(false);
  const [carrier, setCarrier] = useState('');
  const [tracking, setTracking] = useState('');

  const invokeFulfillment = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('sale-fulfillment-update', {
        body: { transaction_id: transactionId, action, ...extra },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success('Buyer notified.');
      setShipOpen(false);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'We could not save that update.');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('confirm-sale', {
        body: { transaction_id: transactionId, role },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success('Confirmation recorded.');
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'We could not record your confirmation.');
    } finally {
      setBusy(false);
    }
  };

  if (step.action === 'none') return null;

  const label = step.actionLabel ?? 'Continue';

  const handleClick = () => {
    if (busy) return;
    switch (step.action) {
      case 'message': return onMessage();
      case 'mark_ready_for_pickup': return void invokeFulfillment('ready_for_pickup');
      case 'mark_shipped': return setShipOpen(true);
      case 'mark_delivered': return void invokeFulfillment('mark_delivered');
      case 'confirm': return void confirm();
    }
  };

  const Icon = step.action === 'confirm' ? CheckCircle2 : step.action === 'message' ? MessageSquare : ArrowRight;

  return (
    <>
      <Button variant="cta" size="lg" className="w-full sm:w-auto" disabled={busy} onClick={handleClick}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icon className="mr-2 h-4 w-4" />}
        {label}
      </Button>

      <Dialog open={shipOpen} onOpenChange={setShipOpen}>
        <DialogContent className="sale-light sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as on the way</DialogTitle>
            <DialogDescription>
              Add carrier details if you have them. Leave blank if you are delivering it yourself.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Carrier (optional)" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
            <Input placeholder="Tracking number (optional)" value={tracking} onChange={(e) => setTracking(e.target.value)} />
          </div>
          <DialogFooter>
            <Button
              variant="cta"
              disabled={busy}
              onClick={() => invokeFulfillment('mark_shipped', {
                carrier: carrier.trim() || undefined,
                tracking_number: tracking.trim() || undefined,
              })}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Notify buyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SaleHandoffActions;
