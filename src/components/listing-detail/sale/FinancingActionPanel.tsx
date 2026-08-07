import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Banknote, ExternalLink, FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SaleCard } from '@/components/listing-detail/sale/SaleCard';
import { generateFinancingPurchaseSheet } from '@/lib/financing/purchaseSheet';
import { FinancingAvailableBadge } from '@/components/financing/FinancingAvailableBadge';
import { useEquinoxFinancingEnabled } from '@/hooks/useListingFinancing';
import { EQUINOX_APPLY_URL, isFinanceableSaleListing } from '@/lib/financing/disclosure';
import { toast } from 'sonner';

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
  const enabled = useEquinoxFinancingEnabled(listing);

  if (!enabled) return null;

  const handleDownload = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('financing-purchase-sheet', {
        body: { listingId: listing.id },
      });
      if (error || !data?.listing) throw new Error('sheet_unavailable');
      generateFinancingPurchaseSheet(data.listing, data.sellerName || 'Vendibook member');
    } catch {
      toast.error('Could not generate the purchase summary. Please try again.');
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
          <div className="mb-2">
            <FinancingAvailableBadge />
          </div>
          <h3 className="text-base font-semibold">Financing options for this equipment</h3>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">
            This seller offers financing options through Equinox Funding. Apply directly with
            Equinox, or download a pro forma purchase summary to share with a financing provider.
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button asChild variant="outline" size="sm" className="justify-center">
          <Link to="/financing">Learn About Financing</Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="justify-center">
          <a href={EQUINOX_APPLY_URL} target="_blank" rel="noopener noreferrer">
            Apply with Equinox
            <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
          </a>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void handleDownload()}
          disabled={busy}
          className="justify-center sm:col-span-2"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <FileDown className="h-3.5 w-3.5 mr-1.5" />
          )}
          Download Financing Purchase Sheet
        </Button>
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
