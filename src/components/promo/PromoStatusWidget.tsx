import { usePromoStatus } from '@/hooks/usePromoStatus';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Clock, DollarSign, Gift, AlertCircle, ExternalLink, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

const PromoStatusWidget = () => {
  const { data: promo, isLoading } = usePromoStatus();
  const { isConnected, connectStripe, isConnecting } = useStripeConnect();

  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-xl" />;
  }

  if (!promo?.promotion) return null;

  const reward = promo.listingReward;
  const entry = promo.contestEntry;
  const winner = promo.contestWinner;
  const daysActive = reward?.active_days_count || 0;
  const daysRequired = 14;
  const progress = Math.min((daysActive / daysRequired) * 100, 100);

  const now = new Date();
  const promoEnd = new Date(promo.promotion.end_at_et);
  const entryDeadline = new Date(promo.promotion.entry_deadline_et);
  const isWithinPromoWindow = now <= promoEnd;
  const isEntryOpen = now <= entryDeadline;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Launch Promo
          </CardTitle>
          <Link to="/promo" className="text-xs text-primary hover:underline flex items-center gap-1">
            Details <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Requirements Checklist */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            {promo.isStripeConnected ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-500" />
            )}
            <span className={promo.isStripeConnected ? 'text-foreground' : 'text-muted-foreground'}>
              Stripe Connected
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {promo.isIdentityVerified ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-500" />
            )}
            <span className={promo.isIdentityVerified ? 'text-foreground' : 'text-muted-foreground'}>
              Identity Verified
            </span>
          </div>
        </div>

        {/* $10 Listing Reward Status */}
        <div className="p-3 rounded-lg bg-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium flex items-center gap-1.5">
              <DollarSign className="h-4 w-4" />
              $10 Listing Reward
            </span>
            {reward?.payout_status === 'paid' && (
              <Badge variant="default" className="bg-emerald-500 text-white">Paid</Badge>
            )}
            {reward?.payout_status === 'eligible' && (
              <Badge variant="secondary">Reward Scheduled</Badge>
            )}
            {reward?.payout_status === 'disqualified' && (
              <Badge variant="destructive">Disqualified</Badge>
            )}
            {reward?.payout_status === 'pending' && (
              <Badge variant="outline">Tracking</Badge>
            )}
            {!reward && isWithinPromoWindow && (
              <Badge variant="outline">Publish to Start</Badge>
            )}
            {!reward && !isWithinPromoWindow && (
              <Badge variant="secondary">Window Closed</Badge>
            )}
          </div>
          {reward && reward.payout_status === 'pending' && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Days Active: {daysActive}/{daysRequired}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        {/* $500 Facebook Drawing */}
        <div className="p-3 rounded-lg bg-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium flex items-center gap-1.5">
              <Share2 className="h-4 w-4" />
              $500 Facebook Drawing
            </span>
            {winner && (
              <Badge variant="default" className="bg-amber-500 text-white">🏆 Winner!</Badge>
            )}
            {entry?.status === 'verified' && !winner && (
              <Badge variant="default" className="bg-emerald-500 text-white">Entered</Badge>
            )}
            {entry?.status === 'pending' && (
              <Badge variant="outline">Pending Review</Badge>
            )}
            {entry?.status === 'rejected' && (
              <Badge variant="destructive">Rejected</Badge>
            )}
            {!entry && isEntryOpen && (
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                Open
              </Badge>
            )}
            {!entry && !isEntryOpen && (
              <Badge variant="secondary">Closed</Badge>
            )}
          </div>
          {!entry && isEntryOpen && reward && (
            <Link to="/promo#contest">
              <Button size="sm" variant="outline" className="w-full mt-1 text-xs">
                Enter Drawing
              </Button>
            </Link>
          )}
        </div>

        {/* Quick Actions */}
        {!promo.isStripeConnected && (
          <Button size="sm" onClick={() => connectStripe()} disabled={isConnecting} className="w-full">
            {isConnecting ? 'Connecting...' : 'Connect Stripe to Qualify'}
          </Button>
        )}
        {promo.isStripeConnected && !promo.isIdentityVerified && (
          <Button size="sm" asChild className="w-full">
            <Link to="/verify-identity">Verify Identity to Qualify</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default PromoStatusWidget;
