import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, Calendar, HandCoins, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ActionRequiredBannerProps {
  pendingRequests: number;
  pendingOffers: number;
  draftListings?: number;
}

const ActionRequiredBanner = ({ pendingRequests, pendingOffers, draftListings = 0 }: ActionRequiredBannerProps) => {
  const totalActions = pendingRequests + pendingOffers + draftListings;
  
  if (totalActions === 0) return null;

  // Build action items
  const actionItems: { label: string; count: number; icon: React.ElementType; tab: string }[] = [];
  
  if (pendingRequests > 0) {
    actionItems.push({ 
      label: `${pendingRequests} pending request${pendingRequests > 1 ? 's' : ''}`, 
      count: pendingRequests, 
      icon: Calendar,
      tab: 'bookings'
    });
  }
  
  if (pendingOffers > 0) {
    actionItems.push({ 
      label: `${pendingOffers} new offer${pendingOffers > 1 ? 's' : ''}`, 
      count: pendingOffers, 
      icon: HandCoins,
      tab: 'offers'
    });
  }

  if (draftListings > 0) {
    actionItems.push({ 
      label: `${draftListings} draft${draftListings > 1 ? 's' : ''} to complete`, 
      count: draftListings, 
      icon: FileText,
      tab: 'listings'
    });
  }

  // Primary action is the first item
  const primaryAction = actionItems[0];

  return (
    <Card className="border border-amber-300 dark:border-amber-700 shadow-md bg-amber-50 dark:bg-amber-950/20">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-amber-500 text-white shadow-lg flex items-center justify-center">
            <AlertCircle className="h-6 w-6" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm leading-tight">
              Action Required
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {actionItems.map((item, idx) => (
                <span key={item.tab}>
                  {item.label}
                  {idx < actionItems.length - 1 ? ' and ' : ''}
                </span>
              ))}
            </p>
          </div>

          <div className="flex-shrink-0">
            <Button 
              size="sm" 
              variant="dark-shine" 
              className="gap-1.5"
              onClick={() => {
                // Scroll to the relevant tab section
                const tabTrigger = document.querySelector(`[data-state][value="${primaryAction.tab}"]`) as HTMLElement;
                if (tabTrigger) tabTrigger.click();
              }}
            >
              Review
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActionRequiredBanner;
