import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, ExternalLink, FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SaleCard } from '@/components/listing-detail/sale/SaleCard';
import { getPublicDisplayName } from '@/lib/displayName';
import { generateFinancingPurchaseSheet } from '@/lib/financing/purchaseSheet';
import { toast } from 'sonner';

const FINANCEABLE_CATEGORIES = ['food_truck', 'food_trailer'];

export const isFinanceableSaleListing = (listing: any) =>
  !!listing &&
  listing.mode === 'sale' &&
  FINANCEABLE_CATEGORIES.includes(String(listing.category));

interface FinancingActionPanelProps {
  listing: any;
  host?: any;
  className?: string;
}

export const FinancingActionPanel = ({ listing, host, className }: FinancingActionPanelProps) => {
  const [busy, setBusy] = useState(false);

  if (!isFinanceableSaleListing(listing)) return null;

  const handleDownload = () => {
    setBusy(true);
    try {
      generateFinancingPurchaseSheet(listing, getPublicDisplayName(host, 'Vendibook member'));
    } catch {
      toast.error('Could not generate the purchase sheet. Please try again.');
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
          <h3 className="text-base font-semibold">Need financing for this equipment?</h3>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">
            Explore equipment financing options or download a purchase summary to share with a
            financing provider.
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button asChild variant="outline" size="sm" className="justify-center">
          <Link to="/financing">Learn About Financing</Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="justify-center">
          <a
            href="https://equinox-funding.com/efapplication/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Apply with Equinox
            <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
          </a>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
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
        Vendibook is not a lender and does not guarantee approval, rates, or terms.
      </p>
    </SaleCard>
  );
};

export default FinancingActionPanel;
