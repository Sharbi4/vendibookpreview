import { useState } from 'react';
import { Banknote, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSetListingFinancing } from '@/hooks/useListingFinancing';
import { EQUINOX_DISCLOSURE_TEXT } from '@/lib/financing/disclosure';
import { cn } from '@/lib/utils';

interface ListingFinancingToggleProps {
  listingId: string;
  /** Current opt-in state, batch-loaded by the parent list. */
  optedIn: boolean;
  className?: string;
}

/**
 * Compact seller control shown on for-sale dashboard cards. Enabling always
 * requires an explicit disclosure confirmation first — nothing is ever
 * switched on automatically.
 */
export const ListingFinancingToggle = ({
  listingId,
  optedIn,
  className,
}: ListingFinancingToggleProps) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const mutation = useSetListingFinancing();
  const isOn = optimistic ?? optedIn;

  const apply = async (enabled: boolean) => {
    setOptimistic(enabled);
    try {
      await mutation.mutateAsync({ listingId, enabled });
      toast.success(enabled ? 'Buyer financing is on' : 'Buyer financing is off');
    } catch (err: any) {
      setOptimistic(null);
      toast.error(err?.message || 'Could not update financing. Please try again.');
    }
  };

  const handleChange = (next: boolean) => {
    if (mutation.isPending) return;
    if (next) setConfirmOpen(true);
    else void apply(false);
  };

  return (
    <>
      <div
        className={cn(
          'flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5',
          className,
        )}
      >
        <div className="mt-0.5 shrink-0 rounded-full bg-emerald-400/10 p-1.5 ring-1 ring-emerald-300/25">
          <Banknote className="h-3.5 w-3.5 text-emerald-300" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-foreground">
              Buyer financing: {isOn ? 'On' : 'Off'}
            </span>
            <div className="flex items-center gap-2">
              {mutation.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden />
              )}
              <Switch
                checked={isOn}
                disabled={mutation.isPending}
                onCheckedChange={handleChange}
                aria-label={`Buyer financing for this listing is ${isOn ? 'on' : 'off'}`}
              />
            </div>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Qualified buyers can apply through Equinox. If approved, the financing provider pays
            the seller directly.
          </p>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Turn on buyer financing?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-left">
              <span className="block">
                Vendibook is not a lender. Approval and terms are not guaranteed, and the buyer
                leaves Vendibook to apply directly with Equinox Funding.
              </span>
              <span className="block text-[11px] leading-relaxed">{EQUINOX_DISCLOSURE_TEXT}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                void apply(true);
              }}
            >
              I understand — turn it on
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ListingFinancingToggle;
