import { Link } from 'react-router-dom';
import { HostSubscriptionCard } from '@/components/account/HostSubscriptionCard';
import { Button } from '@/components/ui/button';
import { ArrowRight, Receipt } from 'lucide-react';

const MembershipTab = () => (
  <div className="max-w-[840px] mx-auto space-y-6">
    <header>
      <h1 className="text-2xl font-semibold text-foreground">Membership</h1>
      <p className="text-sm text-muted-foreground mt-1">Your host plan, renewal, and billing.</p>
    </header>

    <HostSubscriptionCard />

    <div className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between gap-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">Manage subscription</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Change plan, schedule cancellation, or update your payment method.
        </p>
      </div>
      <Button asChild size="sm">
        <Link to="/account/subscription">Open manager <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
      </Button>
    </div>

    <div className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
          <Receipt className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-foreground">Purchases & entitlements</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Boosts, one-off tools, and add-ons you own.</p>
        </div>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link to="/purchases">View</Link>
      </Button>
    </div>
  </div>
);

export default MembershipTab;
