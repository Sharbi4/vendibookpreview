import React, { useEffect, useRef, useState } from 'react';
import { Check, Circle, Camera, DollarSign, Calendar, FileText, CreditCard, MapPin, ChevronRight, ChevronDown, Clock, Sparkles, Shield, Eye } from 'lucide-react';
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
  defaultExpanded?: boolean;
}

export const PublishChecklist: React.FC<PublishChecklistProps> = ({
  items,
  onItemClick,
  onPublishClick,
  hidePublishButton = false,
  className,
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const completedCount = items.filter(i => i.completed).length;
  const requiredItems = items.filter(i => i.required);
  const requiredCompleted = requiredItems.filter(i => i.completed).length;
  const allRequiredComplete = requiredCompleted === requiredItems.length;
  const progressPercentage = Math.round((completedCount / items.length) * 100);
  
  const nextStep = items.find(i => i.required && !i.completed) || items.find(i => !i.completed);
  
  const prevCompletedRef = useRef(completedCount);
  const prevAllRequiredRef = useRef(allRequiredComplete);
  
  useEffect(() => {
    if (completedCount > prevCompletedRef.current) {
      toast({ title: "Nice! Your listing looks stronger already.", duration: 3000 });
    }
    prevCompletedRef.current = completedCount;
  }, [completedCount]);
  
  useEffect(() => {
    if (allRequiredComplete && !prevAllRequiredRef.current) {
      toast({ title: "Publish unlocked 🎉", description: "Your listing is ready to go live!", duration: 4000 });
    }
    prevAllRequiredRef.current = allRequiredComplete;
  }, [allRequiredComplete]);

  return (
    <div className={cn(
      "rounded-2xl border border-border/60 shadow-xl backdrop-blur-md bg-card/70",
      "bg-gradient-to-br from-background/80 via-card/60 to-muted/30",
      className
    )}>
      {/* Collapsible Header */}
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="w-full p-4 flex items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <h3 className="font-semibold text-foreground text-sm truncate">Launch Checklist</h3>
          <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
            {progressPercentage}%
          </span>
        </div>
        <ChevronDown className={cn(
          "w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200",
          expanded && "rotate-180"
        )} />
      </button>

      {/* Compact progress bar always visible */}
      {!expanded && (
        <div className="px-4 pb-3 -mt-1">
          <Progress value={progressPercentage} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground mt-1.5">
            {allRequiredComplete
              ? "Ready to publish!"
              : `${requiredItems.length - requiredCompleted} step${requiredItems.length - requiredCompleted > 1 ? 's' : ''} remaining`}
          </p>
        </div>
      )}

      {/* Expanded Content */}
      {expanded && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 pb-2">
            <Progress value={progressPercentage} className="h-1.5" />
          </div>

          {/* Do This Next */}
          {nextStep && !allRequiredComplete && (
            <div className="mx-3 mt-1 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">Next</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground truncate">{nextStep.label}</p>
                <Button 
                  size="sm" 
                  variant="dark-shine"
                  className="h-7 text-xs px-3 shrink-0"
                  onClick={(e) => { e.stopPropagation(); onItemClick?.(nextStep.id); }}
                >
                  Start
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          )}
          
          {/* Checklist Items */}
          <div className="p-3 space-y-1">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => onItemClick?.(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all",
                  item.current
                    ? "bg-muted/50 border border-border/60"
                    : "hover:bg-muted/30"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors",
                    item.completed
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {item.completed ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Circle className="w-3 h-3" />
                  )}
                </div>
                <span className={cn(
                  "flex-1 text-sm font-medium truncate",
                  item.completed ? "text-muted-foreground" : "text-foreground"
                )}>
                  {item.label}
                </span>
                {!item.required && !item.completed && (
                  <span className="text-[10px] text-muted-foreground shrink-0">Optional</span>
                )}
              </button>
            ))}
          </div>
          
          {/* Footer */}
          {!hidePublishButton && (
            <div className="p-3 pt-0">
              <Button 
                className="w-full"
                disabled={!allRequiredComplete}
                variant={allRequiredComplete ? "dark-shine" : "secondary"}
                onClick={onPublishClick}
              >
                {allRequiredComplete && <Sparkles className="w-4 h-4 mr-2" />}
                Publish Listing
              </Button>
              <p className="text-[10px] text-center text-muted-foreground mt-2">
                {allRequiredComplete 
                  ? "Ready to publish!" 
                  : `${requiredItems.length - requiredCompleted} step${requiredItems.length - requiredCompleted > 1 ? 's' : ''} remaining`}
              </p>
            </div>
          )}
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
      id: 'headline',
      label: 'Headline & Description',
      icon: <FileText className="w-4 h-4" />,
      completed: formState.hasDescription,
      required: true,
      current: currentStep === 'headline',
      statusHint: getDetailsStatusHint(),
      valueTag: 'Fewer questions',
      timeEstimate: '~3 min',
      benefit: 'Great descriptions reduce back-and-forth',
    },
    {
      id: 'includes',
      label: "What's Included",
      icon: <Check className="w-4 h-4" />,
      completed: true, // Optional step
      required: false,
      current: currentStep === 'includes',
      statusHint: 'Optional',
      timeEstimate: '~2 min',
      benefit: 'Highlight features to attract more interest',
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

  items.push({
    id: 'location',
    label: 'Location & Logistics',
    icon: <MapPin className="w-4 h-4" />,
    completed: formState.hasLocation,
    required: true,
    current: currentStep === 'location',
    statusHint: getLocationStatusHint(),
    timeEstimate: '~2 min',
    benefit: 'Clear logistics build renter confidence',
  });

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
