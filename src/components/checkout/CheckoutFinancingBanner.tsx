import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ApproveApplicationButton } from '@/components/financing/ApproveApplicationButton';
import { useApproveFinancingEnabled } from '@/hooks/useListingFinancing';
import { generateFinancingPurchaseSheet } from '@/lib/financing/purchaseSheet';
import { trackFinancingSheetDownloaded } from '@/lib/analytics';
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
  const enabled = useApproveFinancingEnabled(listing);
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

  const equipment = { id: listing.id, title: typeof listing.title === 'string' ? listing.title : undefined,
    price_sale: typeof listing.price_sale === 'number' ? listing.price_sale : undefined,
    condition: typeof listing.condition === 'string' ? listing.condition : null };
  return (
    <aside className={cn('sale-financing-panel checkout-approve-panel', className)}>
      <h3 className="text-sm font-semibold text-slate-900">Apply for financing</h3>
      <p className="mt-1 text-sm">Easy online application. Review estimates and offers with the financing provider.</p>
      <div className="mt-4">
        <ApproveApplicationButton listing={equipment} source="checkout_banner" showBanner={variant !== 'compact'} />
      </div>
      {variant !== 'compact' && <button type="button" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-700 underline underline-offset-4" onClick={() => void downloadSheet()} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <FileDown className="h-4 w-4" aria-hidden />}
        Download purchase sheet
      </button>}
      <p className="mt-3 text-xs leading-relaxed">Lenders determine approval, rates and terms. Vendibook is not a lender. Financing approval does not complete your purchase.</p>
    </aside>
  );
};
export default CheckoutFinancingBanner;
