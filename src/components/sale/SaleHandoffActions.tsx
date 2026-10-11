import { useState } from 'react';
import { Loader2, ArrowRight, CheckCircle2, MessageSquare, CalendarClock, AlertTriangle, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handoffMethod, type HandoffNextStep, type HandoffRole, type SaleTxLike } from '@/lib/sale/handoff';

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

const DELIVERY_ACTIVE = ['pending_cash', 'paid', 'buyer_confirmed', 'seller_confirmed'];

/**
 * Seller-only secondary delivery controls for delivery / freight sales:
 * "Out for delivery", "Update delivery date" (set_eta) and "Report delay"
 * (report_delay), all via `sale-fulfillment-update`.
 */
export const SaleDeliveryControls = ({ transactionId, tx, onDone }: {
  transactionId: string;
  tx: SaleTxLike;
  onDone: () => void;
}) => {
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<'set_eta' | 'report_delay' | null>(null);
  const [start, setStart] = useState(tx.estimated_delivery_date ?? '');
  const [end, setEnd] = useState(tx.estimated_delivery_end ?? '');
  const [note, setNote] = useState('');

  if (handoffMethod(tx) === 'pickup' || !DELIVERY_ACTIVE.includes(String(tx.status ?? ''))) return null;
  const ship = String(tx.shipping_status ?? 'pending');
  if (ship === 'delivered' || tx.delivered_at) return null;

  const invoke = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('sale-fulfillment-update', {
        body: { transaction_id: transactionId, action, ...extra },
      });
      if (error) throw error;
      const failure = (data as { error?: string } | null)?.error;
      if (failure) throw new Error(failure);
      toast.success('Buyer notified.');
      setDialog(null);
      setNote('');
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'We could not save that update.');
    } finally {
      setBusy(false);
    }
  };

  const submitDate = () => {
    if (!start) { toast.error('Add the expected delivery date.'); return; }
    if (end && end < start) { toast.error('The delivery window must end on or after it starts.'); return; }
    void invoke(dialog ?? 'set_eta', {
      estimated_delivery_date: start,
      estimated_delivery_end: end || undefined,
      notes: note.trim() || undefined,
    });
  };

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {ship === 'shipped' && (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void invoke('mark_out_for_delivery')}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Truck className="mr-2 h-4 w-4" />}
          Out for delivery
        </Button>
      )}
      <Button size="sm" variant="outline" disabled={busy} onClick={() => setDialog('set_eta')}>
        <CalendarClock className="mr-2 h-4 w-4" /> Update delivery date
      </Button>
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => setDialog('report_delay')}>
        <AlertTriangle className="mr-2 h-4 w-4" /> Report delay
      </Button>

      <Dialog open={dialog !== null} onOpenChange={(open) => { if (!open) setDialog(null); }}>
        <DialogContent className="sale-light sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog === 'report_delay' ? 'Report a delay' : 'Update delivery date'}</DialogTitle>
            <DialogDescription>
              The buyer is notified of the new date. Add an end date for a delivery window.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="eta-start">Expected delivery</Label>
                <Input id="eta-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="eta-end">Window ends (optional)</Label>
                <Input id="eta-end" type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>
            <Textarea
              placeholder={dialog === 'report_delay' ? 'What caused the delay? (optional)' : 'Note for the buyer (optional)'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="cta" disabled={busy} onClick={submitDate}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Notify buyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SaleHandoffActions;
