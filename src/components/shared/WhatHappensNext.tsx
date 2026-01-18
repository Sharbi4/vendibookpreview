import { CheckCircle2, Clock, CreditCard, MessageCircle, Truck, Package, ArrowRight, ShieldCheck, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface TimelineStep {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  title: string;
  description?: string;
  isComplete?: boolean;
  isActive?: boolean;
}

interface WhatHappensNextProps {
  steps: TimelineStep[];
  title?: string;
  className?: string;
  compact?: boolean;
}

const WhatHappensNext = ({ 
  steps, 
  title = "What happens next?",
  className,
  compact = false,
}: WhatHappensNextProps) => {
  return (
    <div className={cn("p-4 bg-muted/50 rounded-xl", className)}>
      <h4 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
        <ArrowRight className="h-4 w-4 text-primary" />
        {title}
      </h4>
      <div className={cn("space-y-3", compact && "space-y-2")}>
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={index} className="flex items-start gap-3">
              <div 
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                  step.isComplete ? step.iconBg : step.isActive ? step.iconBg : "bg-muted"
                )}
              >
                {step.isComplete ? (
                  <CheckCircle2 className={cn("h-3.5 w-3.5", step.iconColor)} />
                ) : (
                  <Icon className={cn("h-3.5 w-3.5", step.isActive ? step.iconColor : "text-muted-foreground")} />
                )}
              </div>
              <div className={cn(compact && "py-0.5")}>
                <p className={cn(
                  "text-sm font-medium",
                  step.isComplete ? "text-muted-foreground line-through" : "text-foreground"
                )}>
                  {step.title}
                </p>
                {step.description && !compact && (
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WhatHappensNext;

// Pre-built timeline configurations
export const getSalePickupSteps = (): TimelineStep[] => [
  {
    icon: CreditCard,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    title: "Pay securely via Stripe",
    isActive: true,
  },
  {
    icon: Mail,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    title: "Seller confirms in Dashboard",
    description: "They'll review and accept",
  },
  {
    icon: MessageCircle,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    title: "Coordinate pickup in Messages",
    description: "Agree on time and location",
  },
  {
    icon: ShieldCheck,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    title: "Both confirm → funds release",
    description: "Complete the transaction",
  },
];

export const getSaleFreightSteps = (): TimelineStep[] => [
  {
    icon: CreditCard,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    title: "Pay securely via Stripe",
    isActive: true,
  },
  {
    icon: Clock,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    title: "We contact you within 2 business days",
    description: "To schedule delivery",
  },
  {
    icon: Truck,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    title: "Ships with tracking • 7-10 days",
    description: "Professional freight handling",
  },
  {
    icon: ShieldCheck,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    title: "Confirm in Dashboard → funds release",
    description: "Complete the transaction",
  },
];

export const getSaleLocalDeliverySteps = (): TimelineStep[] => [
  {
    icon: CreditCard,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    title: "Pay securely via Stripe",
    isActive: true,
  },
  {
    icon: Mail,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    title: "Seller confirms in Dashboard",
    description: "They'll review and accept",
  },
  {
    icon: Truck,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    title: "Seller delivers to your address",
    description: "Coordinate timing via Messages",
  },
  {
    icon: ShieldCheck,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    title: "Both confirm → funds release",
    description: "Complete the transaction",
  },
];

export const getBookingInstantSteps = (): TimelineStep[] => [
  {
    icon: CreditCard,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    title: "Pay securely via Stripe",
    isActive: true,
  },
  {
    icon: CheckCircle2,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    title: "Booking confirmed instantly",
    description: "Your dates are secured",
  },
  {
    icon: MessageCircle,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    title: "Get details via Messages",
    description: "Pickup/delivery coordination",
  },
];

export const getBookingRequestSteps = (): TimelineStep[] => [
  {
    icon: Mail,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    title: "Request sent to host",
    isActive: true,
  },
  {
    icon: Clock,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    title: "Host responds within 24-48 hours",
    description: "You'll get a notification",
  },
  {
    icon: CreditCard,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    title: "If approved, pay to confirm",
    description: "Secure your booking",
  },
];
