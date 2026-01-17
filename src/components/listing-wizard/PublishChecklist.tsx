import React from 'react';
import { Check, Circle, Camera, DollarSign, Calendar, FileText, CreditCard, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChecklistItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  completed: boolean;
  required: boolean;
  current?: boolean;
}

interface PublishChecklistProps {
  items: ChecklistItem[];
  onItemClick?: (id: string) => void;
  className?: string;
}

export const PublishChecklist: React.FC<PublishChecklistProps> = ({
  items,
  onItemClick,
  className,
}) => {
  const completedCount = items.filter(i => i.completed).length;
  const requiredItems = items.filter(i => i.required);
  const requiredCompleted = requiredItems.filter(i => i.completed).length;

  return (
    <div className={cn("bg-card border border-border rounded-xl p-4", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Publish checklist</h3>
        <span className="text-sm text-muted-foreground">
          {completedCount}/{items.length} complete
        </span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemClick?.(item.id)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
              item.current
                ? "bg-primary/10 border border-primary"
                : item.completed
                ? "bg-muted/50"
                : "hover:bg-muted/50"
            )}
          >
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                item.completed
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {item.completed ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Circle className="w-3.5 h-3.5" />
              )}
            </div>
            <span
              className={cn(
                "text-sm font-medium flex-1",
                item.completed ? "text-muted-foreground" : "text-foreground"
              )}
            >
              {item.label}
            </span>
            {!item.required && !item.completed && (
              <span className="text-xs text-muted-foreground">Optional</span>
            )}
          </button>
        ))}
      </div>
      {requiredCompleted < requiredItems.length && (
        <p className="text-xs text-muted-foreground mt-4">
          Complete all required items to publish
        </p>
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
  },
  currentStep: string
): ChecklistItem[] => {
  const items: ChecklistItem[] = [
    {
      id: 'photos',
      label: 'Add photos',
      icon: <Camera className="w-4 h-4" />,
      completed: formState.hasPhotos,
      required: true,
      current: currentStep === 'photos',
    },
    {
      id: 'pricing',
      label: 'Set pricing',
      icon: <DollarSign className="w-4 h-4" />,
      completed: formState.hasPricing,
      required: true,
      current: currentStep === 'pricing',
    },
  ];

  if (formState.isRental) {
    items.push({
      id: 'availability',
      label: 'Set availability',
      icon: <Calendar className="w-4 h-4" />,
      completed: formState.hasAvailability,
      required: false,
      current: currentStep === 'availability',
    });
  }

  items.push(
    {
      id: 'details',
      label: 'Add description',
      icon: <FileText className="w-4 h-4" />,
      completed: formState.hasDescription,
      required: true,
      current: currentStep === 'details',
    },
    {
      id: 'location',
      label: 'Location & fulfillment',
      icon: <MapPin className="w-4 h-4" />,
      completed: formState.hasLocation,
      required: true,
      current: currentStep === 'location',
    },
    {
      id: 'stripe',
      label: 'Connect Stripe',
      icon: <CreditCard className="w-4 h-4" />,
      completed: formState.hasStripe,
      required: true,
      current: currentStep === 'stripe',
    }
  );

  return items;
};
