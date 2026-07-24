import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UpgradePackageCards } from '@/components/monetization/UpgradePackageCards';

interface Props {
  listingId: string;
  /** Optional custom trigger; defaults to a compact outline button. */
  trigger?: React.ReactNode;
}

/**
 * Dashboard entry point that opens all three seller upgrades (Featured, Seller Pro,
 * White Glove) for a specific listing. Each card's CTA hits Stripe Checkout via
 * create-monetization-checkout and returns to the dashboard.
 */
export function ListingUpgradesDialog({ listingId, trigger }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="h-9 rounded-xl">
            <TrendingUp className="mr-2 h-4 w-4" />
            Upgrades
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Upgrade this listing</DialogTitle>
          <DialogDescription>
            Optional add-ons to help your listing perform better. Your base listing stays free.
          </DialogDescription>
        </DialogHeader>
        <UpgradePackageCards
          listingId={listingId}
          heading=""
          subheading=""
          skipLabel="Close"
          onSkip={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export default ListingUpgradesDialog;
