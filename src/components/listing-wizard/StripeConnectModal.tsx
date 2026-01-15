import React from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StripeLogo } from '@/components/ui/StripeLogo';

interface StripeConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: () => Promise<void>;
  isConnecting: boolean;
}

export const StripeConnectModal: React.FC<StripeConnectModalProps> = ({
  open,
  onOpenChange,
  onConnect,
  isConnecting,
}) => {
  const handleConnect = async () => {
    await onConnect();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-16 h-16 rounded-full bg-[#635bff]/10 flex items-center justify-center mb-4">
            <StripeLogo size="lg" />
          </div>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            Connect <StripeLogo size="sm" showText /> to Receive Payouts
          </DialogTitle>
          <DialogDescription className="text-center">
            To publish listings and receive payments from renters and buyers, 
            you need to connect your Stripe account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
            <p className="font-medium">With Stripe, you can:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Receive secure payments directly to your bank</li>
              <li>• Get paid within 2-7 business days</li>
              <li>• Accept cards, Apple Pay, and more</li>
            </ul>
          </div>

          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full bg-[#635bff] hover:bg-[#635bff]/90"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <StripeLogo size="sm" className="mr-2" />
                Connect with Stripe
                <ExternalLink className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            You can save drafts without connecting Stripe.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
