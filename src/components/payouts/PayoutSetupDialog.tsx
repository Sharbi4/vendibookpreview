import { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import PayoutMethodForm from '@/components/account/PayoutMethodForm';
import { usePayoutPreference } from '@/hooks/usePayoutPreference';
import { useToast } from '@/hooks/use-toast';
import { PayoutBrandMark } from '@/components/payouts/PayoutBrandMark';
import {
  PAYOUT_METHOD_LABEL,
  PAYOUT_PREFERENCE_DISCLOSURE,
  PAYOUT_STATUS_LABEL,
  type PayoutPreferenceInput,
} from '@/lib/payouts/methods';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingTitle?: string;
}

/**
 * Per-listing payout setup. The preference is account-level (one payout
 * destination per seller) — this dialog just surfaces it where sellers actually
 * think about getting paid: on the listing card. Nothing here gates publishing
 * or buyer checkout; Vendibook sends every payout manually.
 */
export function PayoutSetupDialog({ open, onOpenChange, listingTitle }: Props) {
  const { preference, isLoading, isSaving, savePreference } = usePayoutPreference();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);

  const showForm = editing || (!isLoading && !preference);

  const handleSubmit = async (input: PayoutPreferenceInput) => {
    try {
      const result = await savePreference(input);
      toast({
        title: 'Payout method saved',
        description: result?.pending_verification
          ? 'Your bank details are encrypted and queued for a quick manual verification.'
          : `Payouts will be sent to your ${PAYOUT_METHOD_LABEL[input.method]} account.`,
      });
      setEditing(false);
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Could not save payout method',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Get paid for this listing</DialogTitle>
          <DialogDescription>
            {listingTitle
              ? `Choose where Vendibook sends your proceeds from "${listingTitle}".`
              : 'Choose where Vendibook sends your proceeds.'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your payout method…
          </div>
        ) : showForm ? (
          <div className="space-y-4">
            <PayoutMethodForm
              initialMethod={preference?.method ?? 'paypal'}
              isSaving={isSaving}
              onCancel={preference ? () => setEditing(false) : () => onOpenChange(false)}
              onSubmit={handleSubmit}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card/60 p-4">
              <PayoutBrandMark method={preference!.method} className="h-10 w-10" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {PAYOUT_METHOD_LABEL[preference!.method]}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {preference!.masked_destination} · {PAYOUT_STATUS_LABEL[preference!.status]}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="ml-auto text-xs font-semibold text-primary underline-offset-4 hover:underline"
              >
                Change
              </button>
            </div>
            <p className="flex gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              {PAYOUT_PREFERENCE_DISCLOSURE}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default PayoutSetupDialog;
