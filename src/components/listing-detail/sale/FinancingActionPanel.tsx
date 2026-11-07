import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Banknote, FileDown, Loader2, Lock } from 'lucide-react';
import { PayPalMonogram, PayPalWordmark, ApproveFinancingLogo } from '@/components/brand/ProviderLogos';
import { Button } from '@/components/ui/button';
import { SaleCard } from '@/components/listing-detail/sale/SaleCard';
import { generateFinancingPurchaseSheet } from '@/lib/financing/purchaseSheet';
import { FinancingAvailableBadge } from '@/components/financing/FinancingAvailableBadge';
import { useEquinoxFinancingEnabled } from '@/hooks/useListingFinancing';
import { ApproveApplicationButton } from '@/components/financing/ApproveApplicationButton';
import { isFinanceableSaleListing } from '@/lib/financing/disclosure';
import { toast } from 'sonner';
import {
  trackFinancingSheetDownloaded,
} from '@/lib/analytics';

export { isFinanceableSaleListing };

interface FinancingActionPanelProps {
  listing: any;
  host?: any;
  className?: string;
  /** Hide the "Purchase payment by PayPal" lockup — checkout keeps PayPal
   *  branding inside the payment step only. */
  showPaymentLockup?: boolean;
}

/**
 * Per-listing financing surface. Renders ONLY when the global
 * APPROVE launch flag is on for a published sale listing.
 * All sheet data comes from the authoritative server path.
 */
export const FinancingActionPanel = ({
  listing,
  className,
  showPaymentLockup = false,
}: FinancingActionPanelProps) => {
  const [busy, setBusy] = useState(false);
  const enabled = useEquinoxFinancingEnabled(listing);

  if (!enabled) return null;


  const financingBlockedMessage = (error: any, data: any) =>
    (error?.context?.body?.code ?? data?.code) === 'financing_not_available'
      ? 'Financing is not enabled for this listing.'
      : null;


  const handleDownload = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('financing-purchase-sheet', {
        body: { listingId: listing.id },
      });
      if (error || !data?.listing) {
        throw new Error(financingBlockedMessage(error, data) ?? 'sheet_unavailable');
      }
      generateFinancingPurchaseSheet(data.listing, data.sellerName || 'Vendibook member');
      trackFinancingSheetDownloaded(listing.id, true);
    } catch (err: any) {
      trackFinancingSheetDownloaded(listing.id, false);
      toast.error(
        err?.message && err.message !== 'sheet_unavailable'
          ? err.message
          : 'Could not generate the purchase summary. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };


  return (
    <SaleCard padding="lg" className={className}>
      <div className="flex items-start gap-3 mb-4">
        <div className="shrink-0 w-9 h-9 rounded-full bg-muted ring-1 ring-border flex items-center justify-center">
          <Banknote className="h-4 w-4 text-foreground" />
        </div>
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-3 flex-wrap">
            <FinancingAvailableBadge listingId={listing.id} />
            <ApproveFinancingLogo className="h-5" />
          </div>
          <h3 className="text-base font-semibold">Apply for financing</h3>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">
            Easy online application. Explore your financing options directly with the provider.
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <ApproveApplicationButton listing={listing} />

        <Button
          size="sm"
          onClick={() => void handleDownload()}
          disabled={busy}
          className="finance-cta justify-center font-semibold"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <FileDown className="h-3.5 w-3.5 mr-1.5" />
          )}
          Download Purchase Sheet (PDF)
        </Button>

      </div>

      {showPaymentLockup && (
        <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-2 flex-wrap">
          <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <span className="text-xs text-muted-foreground">Purchase payment by</span>
          <PayPalMonogram className="h-4" />
          <PayPalWordmark surface="light" className="h-3.5" />
        </div>
      )}


      <p className="text-[11px] text-muted-foreground/80 mt-3 leading-relaxed">
        The purchase summary is a pro forma document, not proof of sale, ownership, or financing
        approval. Financing is subject to <ApproveFinancingLogo className="mx-0.5 !h-[1em] !w-auto !px-0.5 !py-0 align-baseline" /> and/or its funding providers&rsquo;
        approval and terms. Vendibook is not a lender.
      </p>    </SaleCard>
  );
};

export default FinancingActionPanel;
