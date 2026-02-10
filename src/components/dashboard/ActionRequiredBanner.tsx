import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, Calendar, HandCoins, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ActionRequiredBannerProps {
  pendingRequests: number;
  pendingOffers: number;
  draftListings?: number;
}

const ActionRequiredBanner = ({ pendingRequests, pendingOffers, draftListings = 0 }: ActionRequiredBannerProps) => {
  const totalActions = pendingRequests + pendingOffers + draftListings;
  
  if (totalActions === 0) return null;

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

  const primaryAction = actionItems[0];

  return (
    <div className="relative rounded-2xl p-[2px] overflow-hidden shadow-lg animate-gradient-border">
      {/* Animated gradient border */}
      <div 
        className="absolute inset-0 rounded-2xl"
        style={{
          background: 'linear-gradient(270deg, hsl(var(--primary)), hsl(280 80% 60%), hsl(330 80% 60%), hsl(var(--primary)))',
          backgroundSize: '300% 300%',
          animation: 'gradient-shift 4s ease infinite',
        }}
      />
      
      {/* Inner content */}
      <div className="relative rounded-[14px] bg-background p-4">
        <div className="flex items-center gap-4">
          <div 
            className="flex-shrink-0 w-12 h-12 rounded-2xl text-white shadow-lg flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(280 80% 60%))',
            }}
          >
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
                const tabTrigger = document.querySelector(`[data-state][value="${primaryAction.tab}"]`) as HTMLElement;
                if (tabTrigger) tabTrigger.click();
              }}
            >
              Review
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
};

export default ActionRequiredBanner;
