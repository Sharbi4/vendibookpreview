import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Landmark, CheckCircle2, AlertCircle, Clock, Wallet, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { usePayoutPreference } from '@/hooks/usePayoutPreference';
import {
  PAYOUT_METHOD_LABEL,
  PAYOUT_PREFERENCE_DISCLOSURE,
  PAYOUT_STATUS_LABEL,
  type PayoutPreferenceInput,
} from '@/lib/payouts/methods';
import PayoutMethodForm from './PayoutMethodForm';
import { SectionCard } from './RowLink';

/**
 * Payments & payouts.
 *
 * Buyer payments run through PayPal. Seller earnings are reviewed and paid
 * MANUALLY by Vendibook — this screen collects a payout preference for those
 * manual payouts. It is not a connected merchant account and it never gates
 * publishing or checkout.
 */
export default function PaymentsPayoutsSection() {
  const { preference, isLoading, isSaving, savePreference } = usePayoutPreference();
  const [editing, setEditing] = useState(false);

  const handleSubmit = async (input: PayoutPreferenceInput) => {
    try {
      const result = await savePreference(input);
      setEditing(false);
      toast.success(
        result?.pending_verification
          ? 'Saved. Vendibook will complete secure verification before your first payout.'
          : 'Payout preference saved.',
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save your payout preference.');
    }
  };

  const status = preference?.status ?? 'not_set';
  const statusBadge = {
    not_set: { cls: 'bg-muted text-muted-foreground border-border', Icon: AlertCircle },
    pending_review: { cls: 'bg-amber-500/15 text-amber-600 border-amber-500/30', Icon: Clock },
    verified: { cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', Icon: CheckCircle2 },
    needs_attention: { cls: 'bg-amber-500/15 text-amber-600 border-amber-500/30', Icon: AlertCircle },
  }[status];
  const StatusIcon = statusBadge.Icon;

  return (
    <SectionCard
      id="section-payments"
      title="Payments & payouts"
      description="How buyers pay you, and where Vendibook sends your reviewed earnings."
    >
      {/* Payout preference */}
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50">
            <Landmark className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">Payout preference</span>
              {!isLoading && (
                <Badge className={`${statusBadge.cls} text-[10px] h-4 px-1.5`}>
                  <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
                  {PAYOUT_STATUS_LABEL[status]}
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-0.5">
              Seller earnings are reviewed and paid manually by Vendibook according to the
              transaction timeline. {PAYOUT_PREFERENCE_DISCLOSURE}
            </p>

            {!isLoading && preference && !editing && (
              <p className="text-sm text-foreground/85 mt-2">
                {PAYOUT_METHOD_LABEL[preference.method]} ·{' '}
                <span className="text-muted-foreground">{preference.masked_destination}</span>
                {preference.method === 'ach' && preference.ach_bank_name && (
                  <span className="text-muted-foreground"> · {preference.ach_bank_name} {preference.ach_account_type}</span>
                )}
              </p>
            )}

            {!isLoading && !preference && !editing && (
              <p className="text-sm text-foreground/85 mt-2">
                No payout method on file yet. You can list, take bookings and get paid by buyers
                before you add one.
              </p>
            )}

            {editing ? (
              <div className="mt-4">
                <PayoutMethodForm
                  initialMethod={preference?.method ?? 'paypal'}
                  isSaving={isSaving}
                  onCancel={() => setEditing(false)}
                  onSubmit={handleSubmit}
                />
              </div>
            ) : (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setEditing(true)}>
                {preference ? 'Change payout method' : 'Add payout method'}
              </Button>
            )}

            {!editing && (
              <p className="text-[11px] text-muted-foreground mt-3">
                Supported methods: PayPal, Venmo, Cash App and direct bank transfer (ACH).
              </p>
            )}
          </div>
        </div>
      </div>

      {/* How buyers pay */}
      <div className="p-5 flex items-start gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50">
          <Wallet className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <span className="text-sm font-semibold text-foreground">Buyer payments</span>
          <p className="text-xs text-muted-foreground mt-0.5">
            Buyer payments are processed securely through PayPal. PayPal decides which eligible
            wallet, card or payment options to show each buyer at checkout, and no card details are
            stored on Vendibook.
          </p>
        </div>
      </div>

      {/* Records */}
      <div className="p-5 flex items-start gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50">
          <Receipt className="h-4 w-4" />
        </div>
        <div className="min-w-0 space-y-1">
          <span className="text-sm font-semibold text-foreground">Receipts & records</span>
          <p className="text-xs text-muted-foreground">
            Every purchase and membership charge is recorded in your Vendibook account, alongside
            the PayPal transaction receipt.
          </p>
          <div className="flex flex-wrap gap-3 pt-1 text-xs">
            <Link to="/account/purchases" className="text-primary underline underline-offset-4">Purchases &amp; receipts</Link>
            <Link to="/account/subscription" className="text-primary underline underline-offset-4">Manage membership</Link>
            <Link to="/dashboard?tab=payouts" className="text-primary underline underline-offset-4">Earnings &amp; payouts</Link>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
