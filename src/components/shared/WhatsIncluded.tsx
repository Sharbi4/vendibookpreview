import { useState } from 'react';
import { ShieldCheck, Lock, RotateCcw, HeadphonesIcon, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface WhatsIncludedProps {
  defaultOpen?: boolean;
  className?: string;
  mode?: 'checkout' | 'booking';
}

const WhatsIncluded = ({ 
  defaultOpen = false, 
  className,
  mode = 'checkout',
}: WhatsIncludedProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const protectionItems = [
    {
      icon: Lock,
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
      iconColor: "text-emerald-600",
      title: "Secure Escrow Payment",
      description: mode === 'checkout' 
        ? "Funds held until both parties confirm"
        : "Protected by Stripe encryption",
    },
    {
      icon: ShieldCheck,
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600",
      title: mode === 'checkout' ? "Buyer Protection" : "Booking Protection",
      description: mode === 'checkout'
        ? "Full refund if item doesn't match listing"
        : "Full refund if host cancels",
    },
    {
      icon: RotateCcw,
      iconBg: "bg-amber-100 dark:bg-amber-900/30",
      iconColor: "text-amber-600",
      title: "Dispute Resolution",
      description: "We mediate any issues between parties",
    },
    {
      icon: HeadphonesIcon,
      iconBg: "bg-purple-100 dark:bg-purple-900/30",
      iconColor: "text-purple-600",
      title: "Dedicated Support",
      description: "Real humans available 7 days a week",
    },
  ];

  return (
    <Collapsible 
      open={isOpen} 
      onOpenChange={setIsOpen}
      className={cn("border border-border rounded-xl overflow-hidden", className)}
    >
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/30 transition-colors group">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">What's Included</span>
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </CollapsibleTrigger>
      
      <CollapsibleContent className="px-4 pb-4">
        <div className="space-y-3 pt-2">
          {protectionItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="flex items-start gap-3">
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                  item.iconBg
                )}>
                  <Icon className={cn("h-3.5 w-3.5", item.iconColor)} />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">{item.title}</h4>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default WhatsIncluded;
