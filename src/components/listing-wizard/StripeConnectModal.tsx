import React from 'react';
import { ExternalLink, Loader2, CreditCard, Wallet, Shield, Clock, Zap, Check } from 'lucide-react';
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

  const features = [
    { icon: CreditCard, title: 'Accept All Cards', desc: 'Visa, Mastercard, Amex & more' },
    { icon: Wallet, title: 'Digital Wallets', desc: 'Apple Pay, Google Pay' },
    { icon: Clock, title: 'Fast Payouts', desc: '2-7 business days' },
    { icon: Shield, title: 'Secure & Protected', desc: 'PCI compliant, fraud protection' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-center pb-2">
          {/* Animated Stripe logo */}
          <div className="relative mx-auto w-20 h-20 mb-4">
            <div className="absolute inset-0 bg-gradient-to-br from-[#635bff]/20 to-[#7c75ff]/20 rounded-full animate-pulse" />
            <div className="absolute inset-2 bg-gradient-to-br from-[#635bff]/30 to-[#7c75ff]/30 rounded-full" />
            <div className="absolute inset-4 bg-gradient-to-br from-[#635bff] to-[#7c75ff] rounded-full flex items-center justify-center shadow-lg shadow-[#635bff]/25">
              <StripeLogo size="lg" className="brightness-0 invert" />
            </div>
          </div>
          
          <DialogTitle className="text-xl flex items-center justify-center gap-2">
            Connect <StripeLogo size="sm" showText /> to Get Paid
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            Set up secure payments and start earning from your listings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Feature grid */}
          <div className="grid grid-cols-2 gap-3">
            {features.map((feature, i) => (
              <div 
                key={i}
                className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg border border-border/50"
              >
                <div className="w-9 h-9 rounded-lg bg-[#635bff]/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-4 h-4 text-[#635bff]" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">{feature.title}</p>
                  <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Setup time estimate */}
          <div className="flex items-center justify-center gap-2 py-2 px-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <Zap className="h-4 w-4 text-emerald-600" />
            <span className="text-sm text-emerald-700 dark:text-emerald-300">
              Quick setup — only takes <strong>2-3 minutes</strong>
            </span>
          </div>

          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            size="lg"
            className="w-full bg-gradient-to-r from-[#635bff] to-[#7c75ff] hover:from-[#5850e6] hover:to-[#6b65e6] shadow-lg shadow-[#635bff]/25 h-12"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Opening Stripe...
              </>
            ) : (
              <>
                <StripeLogo size="sm" className="mr-2 brightness-0 invert" />
                Connect with Stripe
                <ExternalLink className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>

          {/* What you'll need */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">What you'll need:</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-foreground">
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span>Bank account info</span>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span>Government ID</span>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span>Business details</span>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span>Tax information</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            You can save drafts without connecting Stripe. Connect anytime before publishing.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
