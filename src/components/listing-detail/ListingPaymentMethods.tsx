import { Banknote, Lock } from 'lucide-react';
import { PayPalMonogram, PayPalWordmark, EquinoxFundingLogo } from '@/components/brand/ProviderLogos';
import { useEquinoxFinancingEnabled } from '@/hooks/useListingFinancing';
import { cn } from '@/lib/utils';

interface ListingPaymentMethodsProps {
  listing: any;
  className?: string;
}

/**
 * Buyer-facing payment surface for a listing detail page.
 * Shows how the seller gets paid (PayPal) and, for opted-in sale listings,
 * that Equinox Funding financing is available.
 */
export const ListingPaymentMethods = ({ listing, className }: ListingPaymentMethodsProps) => {
  const financing = useEquinoxFinancingEnabled(listing);

  // Sale listings honor the seller's saved payment settings. Rentals default to
  // PayPal checkout unless the seller explicitly disables it.
  const isSale = listing?.mode === 'sale';
  const paypalEnabled = isSale
    ? listing?.accept_paypal_checkout === true
    : listing?.accept_paypal_checkout !== false;
  const cashPayments = listing?.accept_cash_payment === true;

  if (!paypalEnabled && !cashPayments && !financing) return null;

  return (
    <div
      className={cn(
        'rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm px-4 py-3',
        className,
      )}
    >
      {paypalEnabled && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <span className="text-xs text-muted-foreground">Payment by</span>
            <PayPalMonogram className="h-4" />
            <PayPalWordmark className="h-3.5" />
          </div>
          <p className="text-[11px] text-muted-foreground/80 leading-relaxed mt-2">
            Checkout is processed by PayPal. Card and PayPal balance are accepted — a PayPal account
            is not required to pay by card.
          </p>
        </>
      )}

      {cashPayments && (
          <div
            className={cn(
              'flex items-start gap-2 flex-wrap',
              paypalEnabled ? 'mt-3 pt-3 border-t border-border/50' : '',
            )}
          >
          <Banknote className="h-3.5 w-3.5 text-muted-foreground mt-0.5" aria-hidden />
          <span className="text-xs text-muted-foreground">
            This seller also accepts payment in person at pickup or delivery.
          </span>
        </div>
      )}

      {financing && (
        <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Financing available through</span>
          <EquinoxFundingLogo className="h-5" />
        </div>
      )}
    </div>
  );
};

export default ListingPaymentMethods;
