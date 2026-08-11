import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Banknote, ExternalLink, FileDown, Loader2, Lock } from 'lucide-react';
import { PayPalMonogram, PayPalWordmark, EquinoxFundingLogo } from '@/components/brand/ProviderLogos';
import { Button } from '@/components/ui/button';
import { SaleCard } from '@/components/listing-detail/sale/SaleCard';
import { generateFinancingPurchaseSheet } from '@/lib/financing/purchaseSheet';
import { FinancingAvailableBadge } from '@/components/financing/FinancingAvailableBadge';
import { useEquinoxFinancingEnabled } from '@/hooks/useListingFinancing';
import { isFinanceableSaleListing } from '@/lib/financing/disclosure';
import { toast } from 'sonner';
import {
  trackFinancingApplyClick,
  trackFinancingLearnMoreClick,
  trackFinancingSheetDownloaded,
} from '@/lib/analytics';

export { isFinanceableSaleListing };

interface FinancingActionPanelProps {
  listing: any;
  host?: any;
  className?: string;
}

/**
 * Per-listing financing surface. Renders ONLY when the global
 * `equinox_financing_enabled` flag is on AND this seller opted this listing in.
 * All sheet data comes from the authoritative server path.
 */
export const FinancingActionPanel = ({ listing, className }: FinancingActionPanelProps) => {
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const enabled = useEquinoxFinancingEnabled(listing);

  if (!enabled) return null;

  const financingBlockedMessage = (error: any, data: any) =>
    (error?.context?.body?.code ?? data?.code) === 'financing_not_available'
      ? 'Financing is not enabled for this listing.'
      : null;

  // The apply URL is issued by the server only after it re-verifies the launch
  // flag and this seller's per-listing opt-in.
  const handleApply = async () => {
    trackFinancingApplyClick('listing_panel', listing.id);
    setApplying(true);
    // Open synchronously so mobile browsers don't block the popup.
    const win = window.open('', '_blank', 'noopener,noreferrer');
    try {
      const { data, error } = await supabase.functions.invoke('financing-apply-link', {
        body: { listingId: listing.id },
      });
      if (error || !data?.applyUrl) throw new Error(data?.code || 'apply_unavailable');
      if (win) win.location.href = data.applyUrl;
      else window.location.href = data.applyUrl;
    } catch (err: any) {
      win?.close();
      toast.error(
        err?.message === 'financing_not_available'
          ? 'Financing is not enabled for this listing.'
          : 'Could not open the financing application. Please try again.',
      );
    } finally {
      setApplying(false);
    }
  };

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
        <div className="shrink-0 w-9 h-9 rounded-full bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
          <Banknote className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-3 flex-wrap">
            <FinancingAvailableBadge />
            <EquinoxFundingLogo className="h-5" />
          </div>
          <h3 className="text-base font-semibold">Financing options for this equipment</h3>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">
            This seller offers financing options through Equinox Funding. Apply directly with
            Equinox, or download a pro forma purchase summary to share with a financing provider.
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          size="sm"
          className="finance-cta justify-center font-semibold"
          onClick={() => void handleApply()}
          disabled={applying}
        >
          Apply Now with Equinox
          {applying ? (
            <Loader2 className="h-3.5 w-3.5 ml-1.5 animate-spin" />
          ) : (
            <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
          )}
        </Button>

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
        <Button asChild size="sm" className="finance-cta-outline justify-center sm:col-span-2">
          <Link
            to={`/financing?listing_id=${listing.id}`}
            onClick={() => trackFinancingLearnMoreClick('listing_panel', listing.id)}
          >
            Apply for financing
          </Link>
        </Button>
      </div>

      <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-2 flex-wrap">
        <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        <span className="text-xs text-muted-foreground">Purchase payment by</span>
        <PayPalMonogram className="h-4" />
        <PayPalWordmark className="h-3.5" />
      </div>


      <p className="text-[11px] text-muted-foreground/80 mt-3 leading-relaxed">
        The purchase summary is a pro forma document, not proof of sale, ownership, or financing
        approval. Financing is subject to Equinox Funding and/or its funding providers&rsquo;
        approval and terms. Vendibook is not a lender.
      </p>
    </SaleCard>
  );
};

export default FinancingActionPanel;
