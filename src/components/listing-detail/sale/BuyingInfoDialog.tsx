import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { FreightLink } from '@/components/shared/FreightLink';
import { MapPin, Truck, Package, ShieldCheck, Lock, FileText, Banknote, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface BuyingInfoDialogProps {
  offersPickup: boolean;
  sellerDelivers: boolean;
  freightEnabled: boolean;
  financingEnabled: boolean;
  listingId?: string;
  locationLabel?: string | null;
  deliveryNote?: string | null;
  trigger?: ReactNode;
}

const Row = ({ icon: Icon, title, children }: { icon: any; title: ReactNode; children: ReactNode }) => (
  <div className="flex items-start gap-3">
    <Icon className="h-[18px] w-[18px] mt-0.5 shrink-0 text-muted-foreground" />
    <div className="min-w-0">
      <div className="text-sm font-medium leading-tight">{title}</div>
      <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{children}</p>
    </div>
  </div>
);

/**
 * Single "How buying works" overlay.
 *
 * Replaces the old stacked page modules (pickup & delivery, purchase
 * confidence). Content is explanatory only — no pricing is invented here and
 * every number shown comes from the listing's own saved fulfillment settings.
 */
export const BuyingInfoDialog = ({
  offersPickup,
  sellerDelivers,
  freightEnabled,
  financingEnabled,
  listingId,
  locationLabel,
  deliveryNote,
  trigger,
}: BuyingInfoDialogProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button type="button" className="underline underline-offset-2 hover:text-foreground">
            How buying works
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>How buying works</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {offersPickup && (
            <Row icon={MapPin} title="Local pickup">
              Pick up from {locationLabel || 'the seller’s area'}. You and the seller coordinate the
              pickup time after checkout.
            </Row>
          )}
          {sellerDelivers && (
            <Row icon={Truck} title="Seller delivery">
              {deliveryNote
                ? `${deliveryNote}. Use the ZIP check in the purchase card to confirm your area before you buy.`
                : 'The seller delivers locally. Use the ZIP check in the purchase card to confirm your area before you buy.'}
            </Row>
          )}
          {freightEnabled && (
            <Row icon={Package} title={<>Nationwide <FreightLink /></>}>
              Available to the 48 contiguous states. Your freight cost is quoted by distance during
              checkout — nothing is charged until you confirm it.{' '}
              <Link to="/vendibook-freight" className="underline underline-offset-2">
                Learn about Vendibook Freight
              </Link>
              .
            </Row>
          )}
          <Row icon={EyeOff} title="Address privacy">
            Only city, state and ZIP are public. The exact street address and handoff instructions
            are released once your purchase is confirmed.
          </Row>
          {financingEnabled && (
            <Row icon={Banknote} title="Equipment financing">
              Financing is offered through Equinox Funding.{' '}
              <Link
                to={listingId ? `/financing?listing_id=${listingId}` : '/financing'}
                className="underline underline-offset-2"
              >
                Learn about financing
              </Link>
              . Vendibook is not a lender; approval and terms are set by the provider.
            </Row>
          )}
          <Row icon={Lock} title="Vendibook Purchase Protection">
            No deposit. Pay through Vendibook checkout and we hold your payment. The seller is paid only after
            you walk through and test the equipment on video, confirm it matches the listing, and both of you sign.
          </Row>
          <Row icon={ShieldCheck} title="Verified sellers">
            Sellers can verify their identity with Plaid and display a verified badge.
          </Row>
          <Row icon={FileText} title="Walkthrough &amp; final sale">
            If something wasn&rsquo;t disclosed, or you decide not to go ahead at the walkthrough, don&rsquo;t confirm:
            the purchase is canceled under the Vendibook Guarantee. Once you confirm and sign, the sale is final.
          </Row>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BuyingInfoDialog;
