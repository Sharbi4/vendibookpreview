import React from 'react';
import { Lightbulb, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface StepHelpTipsProps {
  currentStep: number;
  mode?: 'rent' | 'sale' | null;
  onDismiss?: () => void;
  dismissed?: boolean;
}

interface TipContent {
  title: string;
  tips: string[];
  proTip?: string;
}

const STEP_TIPS: Record<number, TipContent> = {
  1: {
    title: 'Choose Your Listing Type',
    tips: [
      'Rentals earn recurring income; sales are one-time transactions',
      'Food trucks and trailers can be rented or sold',
      'Shared kitchens and Vendor Spaces are typically rentals',
    ],
    proTip: 'Not sure? Rentals often generate more total revenue over time.',
  },
  2: {
    title: 'Make Your Listing Stand Out',
    tips: [
      'Include make, model, and year for vehicles',
      'List key equipment and features included',
      'Mention any unique selling points (generator, wrap, etc.)',
    ],
    proTip: 'Listings with 3+ highlights get 40% more inquiries.',
  },
  3: {
    title: 'Location Matters',
    tips: [
      'Use a specific street address for best search visibility',
      'For delivery, set a realistic radius you can service',
      'Add clear pickup/access instructions to save time later',
    ],
    proTip: 'Listings with exact addresses appear in 2x more searches.',
  },
  4: {
    title: 'Price It Right',
    tips: [
      'Research similar listings in your area',
      'Weekly rates should offer a 10-15% discount vs daily',
      'Consider seasonal demand when setting prices',
    ],
    proTip: 'Competitive pricing leads to faster bookings and better reviews.',
  },
  5: {
    title: 'Required Documents',
    tips: [
      'Common requirements: insurance, food handler permit, business license',
      'Set deadlines to ensure renters are prepared',
      'Clear requirements reduce booking friction',
    ],
    proTip: 'Fewer required docs = faster bookings, but protect yourself appropriately.',
  },
  6: {
    title: 'Photos Sell',
    tips: [
      'Use natural lighting and clean backgrounds',
      'Show interior, exterior, and equipment details',
      'Include at least 5 high-quality photos',
    ],
    proTip: 'Listings with 8+ photos get 3x more bookings.',
  },
  7: {
    title: 'Ready to Publish',
    tips: [
      'Double-check all details for accuracy',
      'Ensure Stripe is connected to receive payments',
      'You can edit your listing anytime after publishing',
    ],
    proTip: 'Publishing today? Share on social media for instant visibility!',
  },
};

// Sale-specific overrides
const SALE_TIPS: Partial<Record<number, Partial<TipContent>>> = {
  3: {
    tips: [
      'Buyers want to know exactly where to pick up',
      'If offering delivery, specify your service area',
      'Clear location info builds trust with serious buyers',
    ],
  },
  4: {
    title: 'Set Your Sale Price',
    tips: [
      'Research comparable sales in your market',
      'Factor in equipment age, condition, and upgrades',
      'Be prepared to negotiate—leave some room',
    ],
    proTip: 'Offering both cash and card options attracts more buyers.',
  },
  5: {
    tips: [
      'Sales typically require fewer documents',
      'Consider requesting proof of business for serious buyers',
      'Keep it simple to encourage quick purchases',
    ],
  },
};

export const StepHelpTips: React.FC<StepHelpTipsProps> = ({
  currentStep,
  mode,
  onDismiss,
  dismissed = false,
}) => {
  if (dismissed) return null;

  const baseTips = STEP_TIPS[currentStep];
  if (!baseTips) return null;

  // Merge sale-specific tips if applicable
  const saleTips = mode === 'sale' ? SALE_TIPS[currentStep] : undefined;
  const tips: TipContent = {
    ...baseTips,
    ...saleTips,
    tips: saleTips?.tips || baseTips.tips,
  };

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 relative">
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={onDismiss}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
      
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Lightbulb className="w-4 h-4 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0 pr-6">
          <h4 className="font-medium text-sm text-foreground mb-2">
            {tips.title}
          </h4>
          
          <ul className="space-y-1.5 mb-3">
            {tips.tips.map((tip, index) => (
              <li 
                key={index}
                className="text-xs text-muted-foreground flex items-start gap-2"
              >
                <span className="text-primary mt-0.5">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
          
          {tips.proTip && (
            <div className="bg-primary/10 rounded-lg px-3 py-2">
              <p className="text-xs font-medium text-primary">
                💡 Pro tip: {tips.proTip}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
