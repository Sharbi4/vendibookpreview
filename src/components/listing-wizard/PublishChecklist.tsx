import React, { useEffect, useRef } from 'react';
import { Check, Circle, Camera, DollarSign, Calendar, FileText, CreditCard, MapPin, ChevronRight, Clock, Sparkles, Shield, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export interface ChecklistItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  completed: boolean;
  required: boolean;
  current?: boolean;
  statusHint?: string;
  valueTag?: string;
  timeEstimate?: string;
  benefit?: string;
}

interface PublishChecklistProps {
  items: ChecklistItem[];
  onItemClick?: (id: string) => void;
  onPublishClick?: () => void;
  hidePublishButton?: boolean;
  className?: string;
}

export const PublishChecklist: React.FC<PublishChecklistProps> = ({
  items,
  onItemClick,
  onPublishClick,
  hidePublishButton = false,
  className,
}) => {
  const completedCount = items.filter(i => i.completed).length;
  const requiredItems = items.filter(i => i.required);
  const requiredCompleted = requiredItems.filter(i => i.completed).length;
  const allRequiredComplete = requiredCompleted === requiredItems.length;
  const progressPercentage = Math.round((completedCount / items.length) * 100);
  
  // Find the first incomplete required item for spotlight
  const nextStep = items.find(i => i.required && !i.completed) || items.find(i => !i.completed);
  
  // Track previous completed count for toast notifications
  const prevCompletedRef = useRef(completedCount);
  const prevAllRequiredRef = useRef(allRequiredComplete);
  
  useEffect(() => {
    if (completedCount > prevCompletedRef.current) {
      toast({
        title: "Nice! Your listing looks stronger already.",
        duration: 3000,
      });
    }
    prevCompletedRef.current = completedCount;
  }, [completedCount]);
  
  useEffect(() => {
    if (allRequiredComplete && !prevAllRequiredRef.current) {
      toast({
        title: "Publish unlocked 🎉",
        description: "Your listing is ready to go live!",
        duration: 4000,
      });
    }
    prevAllRequiredRef.current = allRequiredComplete;
  }, [allRequiredComplete]);

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border-0 shadow-xl bg-card", className)}>
      {/* Header */}
      <div className="relative bg-muted/30 border-b border-border p-4 pb-3">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-foreground">Launch Your Listing</h3>
          <span className="text-xs text-primary font-semibold">
            {progressPercentage}%
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          You're close. Finish the essentials to go live.
        </p>
        <Progress value={progressPercentage} className="h-1.5" />
      </div>
      
      {/* Do This Next Spotlight */}
      {nextStep && !allRequiredComplete && (
        <div className="relative mx-4 mt-4 mb-3 p-3 bg-muted/30 border border-border rounded-xl">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-1 bg-primary rounded-md">
              <Sparkles className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">Do this next</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{nextStep.label}</p>
              {nextStep.benefit && (
                <p className="text-xs text-muted-foreground mt-0.5">{nextStep.benefit}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {nextStep.timeEstimate && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {nextStep.timeEstimate}
                </span>
              )}
              <Button 
                size="sm" 
                className="h-7 text-xs px-3"
                onClick={() => onItemClick?.(nextStep.id)}
              >
                Start
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Checklist Items */}
      <div className="relative px-4 pb-2">
        <div className="space-y-1">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onItemClick?.(item.id)}
              className={cn(
                "w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all bg-muted/30",
                item.current
                  ? "bg-muted border border-border shadow-sm"
                  : item.completed
                  ? "hover:bg-muted/50"
                  : "hover:bg-muted/50"
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors",
                  item.completed
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted-foreground/20 text-muted-foreground"
                )}
              >
                {item.completed ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Circle className="w-3 h-3" />
                )}
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span
                  className={cn(
                    "text-sm font-medium truncate",
                    item.completed ? "text-muted-foreground" : "text-foreground"
                  )}
                >
                  {item.label}
                </span>
                {item.required && !item.completed && item.valueTag && (
                  <span className="text-[9px] font-medium text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">
                    {item.valueTag}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {item.statusHint && (
                  <span className={cn(
                    "text-[10px]",
                    item.completed ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                  )}>
                    {item.statusHint}
                  </span>
                )}
                {!item.required && !item.completed && (
                  <span className="text-[10px] text-muted-foreground">Optional</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Footer with Publish Button - hidden when hidePublishButton is true */}
      {!hidePublishButton && (
        <div className="relative p-4 pt-2 border-t border-border">
          <Button 
            className="w-full"
            disabled={!allRequiredComplete}
            variant={allRequiredComplete ? "default" : "secondary"}
            onClick={onPublishClick}
          >
            {allRequiredComplete ? (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Publish Listing
              </>
            ) : (
              "Publish Listing"
            )}
          </Button>
          <p className="text-[11px] text-center text-muted-foreground mt-2">
            {allRequiredComplete 
              ? "You're ready to publish" 
              : `Finish ${requiredItems.length - requiredCompleted} essential${requiredItems.length - requiredCompleted > 1 ? 's' : ''} to go live`
            }
          </p>
        </div>
      )}
    </div>
  );
};

// Helper to create checklist items based on form state
export const createChecklistItems = (
  formState: {
    hasPhotos: boolean;
    hasPricing: boolean;
    hasAvailability: boolean;
    hasDescription: boolean;
    hasLocation: boolean;
    hasStripe: boolean;
    isRental: boolean;
    photoCount?: number;
    priceSet?: string;
    descriptionLength?: number;
    locationSet?: string;
    requiresStripe?: boolean; // true if card payment is enabled
    hasDocuments?: boolean; // true if documents step was configured
    documentsCount?: number; // number of required documents set
  },
  currentStep: string
): ChecklistItem[] => {
  const getPhotoStatusHint = () => {
    if (!formState.photoCount) return 'Not started';
    return `${formState.photoCount} photo${formState.photoCount > 1 ? 's' : ''}`;
  };
  
  const getPricingStatusHint = () => {
    if (!formState.hasPricing) return 'Not set';
    return formState.priceSet || 'Set';
  };
  
  const getDetailsStatusHint = () => {
    if (!formState.hasDescription) return 'Not started';
    if (formState.descriptionLength && formState.descriptionLength < 50) return 'Needs more';
    return 'Complete';
  };
  
  const getLocationStatusHint = () => {
    if (!formState.hasLocation) return 'Not set';
    return formState.locationSet || 'Set';
  };

  const items: ChecklistItem[] = [
    {
      id: 'photos',
      label: 'Photos & Media',
      icon: <Camera className="w-4 h-4" />,
      completed: formState.hasPhotos,
      required: true,
      current: currentStep === 'photos',
      statusHint: getPhotoStatusHint(),
      valueTag: 'More trust',
      timeEstimate: '~3 min',
      benefit: 'More photos = more booking requests',
    },
    {
      id: 'pricing',
      label: 'Pricing & Rates',
      icon: <DollarSign className="w-4 h-4" />,
      completed: formState.hasPricing,
      required: true,
      current: currentStep === 'pricing',
      statusHint: getPricingStatusHint(),
      valueTag: 'More requests',
      timeEstimate: '~2 min',
      benefit: 'Competitive pricing attracts more renters',
    },
  ];

  if (formState.isRental) {
    items.push({
      id: 'availability',
      label: 'Availability',
      icon: <Calendar className="w-4 h-4" />,
      completed: formState.hasAvailability,
      required: false,
      current: currentStep === 'availability',
      statusHint: formState.hasAvailability ? 'Set' : 'Not set',
      timeEstimate: '~1 min',
      benefit: "Let renters know when you're available",
    });
  }

  items.push(
    {
      id: 'details',
      label: 'Listing Details',
      icon: <FileText className="w-4 h-4" />,
      completed: formState.hasDescription,
      required: true,
      current: currentStep === 'details',
      statusHint: getDetailsStatusHint(),
      valueTag: 'Fewer questions',
      timeEstimate: '~3 min',
      benefit: 'Great descriptions reduce back-and-forth',
    },
    {
      id: 'location',
      label: 'Location & Logistics',
      icon: <MapPin className="w-4 h-4" />,
      completed: formState.hasLocation,
      required: true,
      current: currentStep === 'location',
      statusHint: getLocationStatusHint(),
      timeEstimate: '~2 min',
      benefit: 'Clear logistics build renter confidence',
    },
  );

  // Add documents step for rental listings
  if (formState.isRental) {
    items.push({
      id: 'documents',
      label: 'Required Documents',
      icon: <Shield className="w-4 h-4" />,
      completed: formState.hasDocuments ?? true, // Optional step, defaults to complete
      required: false,
      current: currentStep === 'documents',
      statusHint: formState.documentsCount ? `${formState.documentsCount} required` : 'None set',
      timeEstimate: '~2 min',
      benefit: 'Ensure renters have proper credentials',
    });
  }

  // Only add Stripe requirement if card payment is enabled
  const stripeRequired = formState.requiresStripe !== false;
  if (stripeRequired) {
    items.push({
      id: 'stripe',
      label: 'Payout Setup (Stripe)',
      icon: <CreditCard className="w-4 h-4" />,
      completed: formState.hasStripe,
      required: true,
      current: currentStep === 'stripe',
      statusHint: formState.hasStripe ? 'Connected' : 'Not connected',
      timeEstimate: '~5 min',
      benefit: 'Get paid directly to your bank account',
    });
  }

  // Add review step at the end - always shown, required, completed when all other required items are done
  const allOtherRequiredComplete = items.filter(i => i.required).every(i => i.completed);
  items.push({
    id: 'review',
    label: 'Review Listing',
    icon: <Eye className="w-4 h-4" />,
    completed: allOtherRequiredComplete && currentStep === 'review',
    required: true,
    current: currentStep === 'review',
    statusHint: allOtherRequiredComplete ? 'Ready' : 'Pending',
    timeEstimate: '~1 min',
    benefit: 'Preview your listing before publishing',
  });

  return items;
};
