import { useState } from 'react';
import { 
  Shield, 
  CreditCard, 
  FileCheck, 
  Lock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ProfileTrustSectionProps {
  isVerified: boolean;
  stripeConnected: boolean;
  isHost: boolean;
  isOwnProfile: boolean;
}

const ProfileTrustSection = ({
  isVerified,
  stripeConnected,
  isHost,
  isOwnProfile,
}: ProfileTrustSectionProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const trustItems = [
    {
      id: 'identity',
      icon: Shield,
      label: 'Identity Verified',
      status: isVerified,
      description: 'Government ID verified via Stripe Identity',
    },
    {
      id: 'payouts',
      icon: CreditCard,
      label: 'Payouts Enabled',
      status: stripeConnected,
      description: 'Connected to Stripe for secure payments',
      hideIfNotHost: true,
    },
    {
      id: 'secure',
      icon: Lock,
      label: 'Secure Payments',
      status: true, // Always true for platform
      description: 'All transactions are protected with dispute resolution',
    },
  ];

  const visibleItems = trustItems.filter(item => 
    !item.hideIfNotHost || (item.hideIfNotHost && isHost)
  );

  const completedCount = visibleItems.filter(item => item.status).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full justify-between h-auto py-3 px-4 bg-muted/30 hover:bg-muted/50 rounded-lg"
        >
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Trust & Verification</span>
            <span className="text-xs text-muted-foreground">
              ({completedCount}/{visibleItems.length} complete)
            </span>
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-3 space-y-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <div 
              key={item.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border',
                item.status 
                  ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900'
                  : 'bg-muted/30 border-border/50'
              )}
            >
              <div 
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  item.status 
                    ? 'bg-emerald-100 dark:bg-emerald-900/50'
                    : 'bg-muted'
                )}
              >
                <Icon 
                  className={cn(
                    'h-4 w-4',
                    item.status 
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-muted-foreground'
                  )} 
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                  {item.status ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </div>
          );
        })}

        {/* Learn More Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="link" size="sm" className="w-full text-xs text-muted-foreground">
              Learn more about trust & safety
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Trust & Safety</DialogTitle>
              <DialogDescription>
                How we keep the Vendibook marketplace safe
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <h4 className="font-medium text-sm mb-1">Identity Verification</h4>
                <p className="text-sm text-muted-foreground">
                  Users can verify their identity through Stripe Identity, which checks 
                  government-issued IDs to confirm their identity.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-1">Secure Payments</h4>
                <p className="text-sm text-muted-foreground">
                  All payments are processed through Stripe, providing industry-leading 
                  security and fraud protection.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-1">Dispute Resolution</h4>
                <p className="text-sm text-muted-foreground">
                  If issues arise, our support team helps mediate disputes and 
                  can process refunds when appropriate.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default ProfileTrustSection;
