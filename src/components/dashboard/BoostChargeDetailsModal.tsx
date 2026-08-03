import { Link } from 'react-router-dom';
import { ExternalLink, Receipt as ReceiptIcon, Gift, FileText, RefreshCcw, Clock } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { BoostCharge } from '@/components/dashboard/AccountChargesSection';

interface Props {
  charge: BoostCharge | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const fmt = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—';

const statusMeta = (c: BoostCharge) => {
  if (c.status === 'refunded') return { label: 'Refunded', icon: RefreshCcw, className: 'bg-rose-500/15 text-rose-500' };
  if (c.status === 'expired') return { label: 'Expired', icon: Clock, className: 'bg-muted text-muted-foreground' };
  if (c.source === 'comp') return { label: 'Comped', icon: Gift, className: 'bg-primary/15 text-primary' };
  if (c.isActive) return { label: 'Active', className: 'bg-emerald-500/15 text-emerald-500' };
  return { label: 'Ended', icon: Clock, className: 'bg-muted text-muted-foreground' };
};

const BoostChargeDetailsModal: React.FC<Props> = ({ charge, open, onOpenChange }) => {
  if (!charge) return null;
  const meta = statusMeta(charge);
  const Icon = meta.icon;
  const isComp = charge.source === 'comp';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
              
            </span>
            Featured Boost
          </DialogTitle>
          <DialogDescription className="truncate">
            {charge.listing_title || 'Untitled listing'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge className={`${meta.className} border-0 hover:${meta.className}`}>
              <Icon className="h-3 w-3 mr-1" />
              {meta.label}
            </Badge>
            {isComp && charge.status !== 'refunded' && (
              <Badge className="bg-primary/15 text-primary hover:bg-primary/15 border-0">Goodwill credit</Badge>
            )}
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Line items</div>

            <Row label="Featured Boost · 30 days" value={charge.amount || (isComp ? '$0.00' : '—')} />
            {charge.status === 'refunded' && charge.refund_amount && (
              <Row label="Refund" value={`-${charge.refund_amount}`} valueClass="text-rose-500" />
            )}
            <Separator />
            <Row
              label="Total charged"
              value={
                charge.status === 'refunded'
                  ? '$0.00'
                  : (charge.amount || (isComp ? '$0.00' : '—'))
              }
              bold
            />
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Field label="Charged" value={fmt(charge.paid_at)} />
            <Field label="Activated" value={fmt(charge.applied_at)} />
            <Field label={charge.status === 'refunded' ? 'Ended on refund' : 'Expires'} value={fmt(charge.applied_expires_at || charge.featured_expires_at)} />
            {charge.refunded_at && <Field label="Refunded" value={fmt(charge.refunded_at)} />}
            <Field label="Source" value={isComp ? 'Goodwill credit (Vendibook)' : 'PayPal'} />
            {charge.reason && <Field label="Reason" value={charge.reason} />}
          </div>

          {charge.receipt_id && (
            <div className="text-xs text-muted-foreground">
              Payment reference: <span className="font-mono">{charge.receipt_id}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {charge.receipt_url && (
              <Button asChild variant="default" size="sm" className="gap-1">
                <a href={charge.receipt_url} target="_blank" rel="noopener noreferrer">
                  <FileText className="h-4 w-4" />
                  View receipt
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
            <Button asChild variant="outline" size="sm" className="gap-1">
              <Link to={`/listing/${charge.listing_id}`}>
                <ReceiptIcon className="h-4 w-4" />
                View listing
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Row: React.FC<{ label: string; value: string; valueClass?: string; bold?: boolean }> = ({ label, value, valueClass, bold }) => (
  <div className="flex items-center justify-between text-sm">
    <span className={bold ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
    <span className={`${bold ? 'font-semibold' : ''} ${valueClass || ''}`}>{value}</span>
  </div>
);

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70">{label}</div>
    <div className="text-foreground">{value}</div>
  </div>
);

export default BoostChargeDetailsModal;
