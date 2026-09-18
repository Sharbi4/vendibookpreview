import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { EquinoxFundingLogo } from '@/components/brand/ProviderLogos';
import { useEquinoxFinancingEnabled } from '@/hooks/useListingFinancing';
import { useFinancingHandoff } from '@/hooks/useFinancingHandoff';
import { generateFinancingPurchaseSheet } from '@/lib/financing/purchaseSheet';
import { trackFinancingLearnMoreClick, trackFinancingSheetDownloaded } from '@/lib/analytics';
import { cn } from '@/lib/utils';

interface CheckoutFinancingBannerProps {
  listing: { id: string } & Record<string, unknown>;
  /** `banner` is the full horizontal banner; `compact` fits the summary rail. */
  variant?: 'banner' | 'compact';
  className?: string;
}

/**
 * Optional affordability path inside checkout — never a second payment flow.
 * Third-party financing only: Vendibook is not the lender and makes no claim
 * about approval, rates or terms.
 */
const CheckoutFinancingBanner = ({
  listing,
  variant = 'banner',
  className,
}: CheckoutFinancingBannerProps) => {
  const enabled = useEquinoxFinancingEnabled(listing);
  const { startFinancingApply, financingLeadDialog } = useFinancingHandoff();
  const [busy, setBusy] = useState(false);

  if (!enabled) return null;

  const downloadSheet = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('financing-purchase-sheet', {
        body: { listingId: listing.id },
      });
      if (error || !data?.listing) throw new Error('sheet_unavailable');
      generateFinancingPurchaseSheet(data.listing, data.sellerName || 'Vendibook member');
      trackFinancingSheetDownloaded(listing.id, true);
    } catch {
      trackFinancingSheetDownloaded(listing.id, false);
      toast.error('Could not generate the purchase summary. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (variant === 'compact') {
    return (
      <div className={cn('checkout-financing-compact', className)}>
        <EquinoxFundingLogo className="h-4" />
        <p>Equipment financing is available for this listing through Equinox Funding.</p>
        <Link
          to={`/financing?listing_id=${listing.id}`}
          onClick={() => trackFinancingLearnMoreClick('listing_panel', listing.id)}
        >
          Explore financing
        </Link>
        {financingLeadDialog}
      </div>
    );
  }

  return (
    <aside className={cn('checkout-financing-banner', className)}>
      <div className="checkout-financing-mark">
        <EquinoxFundingLogo className="h-6" />
      </div>
      <div className="checkout-financing-copy">
        <span>Financing available</span>
        <strong>Need financing for this equipment?</strong>
        <p>Explore equipment financing through Equinox Funding before completing your purchase.</p>
      </div>
      <div className="checkout-financing-actions">
        <button
          type="button"
          className="checkout-financing-cta"
          onClick={() => startFinancingApply('checkout_banner', listing.id)}
        >
          Explore financing <ExternalLink aria-hidden />
        </button>
        <button type="button" className="checkout-financing-link" onClick={() => void downloadSheet()} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <FileDown aria-hidden />}
          Download purchase sheet
        </button>
      </div>
      <p className="checkout-financing-note">
        Third-party financing. Approval and terms are determined by Equinox Funding and/or its funding providers.
        Vendibook is not a lender.
      </p>
      {financingLeadDialog}
    </aside>
  );
};

export default CheckoutFinancingBanner;
