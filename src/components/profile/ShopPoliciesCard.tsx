import { useState } from 'react';
import { Package, RotateCcw, Clock, CreditCard, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface ShopPolicies {
  delivery_range_miles?: number;
  return_policy?: string;
  cancellation_notice?: string;
  accepts_deposits?: boolean;
  custom_policies?: string[];
}

interface ShopPoliciesCardProps {
  policies: ShopPolicies | null;
  isOwnProfile?: boolean;
}

const ShopPoliciesCard = ({ policies, isOwnProfile }: ShopPoliciesCardProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Don't render if no policies and not own profile
  if (!policies && !isOwnProfile) return null;

  // Check if there are any policies to show
  const hasPolicies = policies && (
    policies.delivery_range_miles ||
    policies.return_policy ||
    policies.cancellation_notice ||
    policies.accepts_deposits ||
    (policies.custom_policies && policies.custom_policies.length > 0)
  );

  if (!hasPolicies && !isOwnProfile) return null;

  // Empty state for own profile
  if (!hasPolicies && isOwnProfile) {
    return (
      <div className="bg-muted/30 rounded-xl p-4 border border-dashed border-border">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span className="text-sm">Add shop policies to build trust with customers</span>
        </div>
      </div>
    );
  }

  const policyItems = [];

  if (policies?.delivery_range_miles) {
    policyItems.push({
      icon: Package,
      label: `Delivery within ${policies.delivery_range_miles} miles`,
    });
  }

  if (policies?.return_policy) {
    policyItems.push({
      icon: RotateCcw,
      label: policies.return_policy,
    });
  }

  if (policies?.cancellation_notice) {
    policyItems.push({
      icon: Clock,
      label: `${policies.cancellation_notice} cancellation notice`,
    });
  }

  if (policies?.accepts_deposits) {
    policyItems.push({
      icon: CreditCard,
      label: 'Deposits accepted',
    });
  }

  // Show first 2 items always, rest in collapsible
  const visibleItems = policyItems.slice(0, 2);
  const hiddenItems = policyItems.slice(2);
  const hasMoreItems = hiddenItems.length > 0 || (policies?.custom_policies?.length ?? 0) > 0;

  return (
    <div className="bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-border/50">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">Shop Policies</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {visibleItems.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
            <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {hasMoreItems && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
          <CollapsibleContent className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              {hiddenItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            {policies?.custom_policies && policies.custom_policies.length > 0 && (
              <div className="pt-2 border-t border-border/50">
                <ul className="space-y-1">
                  {policies.custom_policies.map((policy, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{policy}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CollapsibleContent>

          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full mt-2 h-7 text-xs">
              {isOpen ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  View all policies
                </>
              )}
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
      )}
    </div>
  );
};

export default ShopPoliciesCard;
