import { Calendar, Clock, CheckCircle2, ArrowRight, Wallet, Info, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StripeLogo } from '@/components/ui/StripeLogo';
import { cn } from '@/lib/utils';
import { format, addDays, isAfter, isBefore, startOfDay } from 'date-fns';
import { PayoutRecord } from '@/hooks/useRevenueAnalytics';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PayoutScheduleCardProps {
  pendingPayout: number;
  payoutHistory: PayoutRecord[];
  onOpenStripeDashboard?: () => void;
  isOpeningDashboard?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
};

export const PayoutScheduleCard = ({
  pendingPayout,
  payoutHistory,
  onOpenStripeDashboard,
  isOpeningDashboard,
}: PayoutScheduleCardProps) => {
  const today = startOfDay(new Date());
  
  // Estimate next payout date (Stripe typically pays out on a rolling basis, usually 2-7 days after transaction)
  // For demo purposes, we'll show the next business day + 2 days
  const estimatedNextPayout = addDays(today, 2);
  
  // Split payouts into upcoming (pending) and past (completed)
  const upcomingPayouts = payoutHistory.filter(p => !p.payout_completed_at);
  const pastPayouts = payoutHistory.filter(p => p.payout_completed_at);
  
  // Calculate total upcoming
  const totalUpcoming = upcomingPayouts.reduce((sum, p) => sum + (p.seller_payout || 0), 0);
  
  // Get last 5 past payouts
  const recentPastPayouts = pastPayouts.slice(0, 5);

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80 overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#635bff]/10 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-[#635bff]" />
            </div>
            Payout Schedule
          </CardTitle>
          <div className="flex items-center gap-2">
            <StripeLogo size="sm" />
            {onOpenStripeDashboard && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onOpenStripeDashboard}
                disabled={isOpeningDashboard}
                className="text-xs"
              >
                {isOpeningDashboard ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : null}
                View in Stripe
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Next Payout Banner */}
        {pendingPayout > 0 && (
          <div className="p-4 bg-gradient-to-r from-[#635bff]/10 via-[#635bff]/5 to-transparent border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#635bff]/20 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-[#635bff]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-muted-foreground">Next Payout</p>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs max-w-[200px]">
                            Payout timing depends on your Stripe settings. Typically 2-7 business days after transaction completion.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(pendingPayout)}</p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="bg-[#635bff]/10 text-[#635bff] border-[#635bff]/20">
                  <Clock className="h-3 w-3 mr-1" />
                  Est. {format(estimatedNextPayout, 'MMM d')}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Payouts */}
        <div className="p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            Upcoming Payouts
            {upcomingPayouts.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {upcomingPayouts.length} pending
              </Badge>
            )}
          </h4>
          
          {upcomingPayouts.length > 0 ? (
            <div className="space-y-2">
              {upcomingPayouts.slice(0, 3).map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-amber-500/5 to-transparent border border-amber-500/10 hover:border-amber-500/20 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <div>
                      <p className="text-sm font-medium truncate max-w-[180px]">
                        {payout.listing_title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(payout.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(payout.seller_payout)}
                    </p>
                    <p className="text-xs text-amber-600">Processing</p>
                  </div>
                </div>
              ))}
              {upcomingPayouts.length > 3 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  +{upcomingPayouts.length - 3} more pending
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm bg-muted/30 rounded-lg">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No pending payouts
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="px-4">
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        {/* Past Payouts */}
        <div className="p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Recent Payouts
            {recentPastPayouts.length > 0 && (
              <Badge variant="secondary" className="ml-auto bg-emerald-500/10 text-emerald-600 border-0">
                {pastPayouts.length} completed
              </Badge>
            )}
          </h4>
          
          {recentPastPayouts.length > 0 ? (
            <div className="space-y-2">
              {recentPastPayouts.map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-emerald-500/5 to-transparent border border-emerald-500/10 hover:border-emerald-500/20 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium truncate max-w-[180px]">
                        {payout.listing_title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Paid {payout.payout_completed_at ? format(new Date(payout.payout_completed_at), 'MMM d, yyyy') : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-emerald-600">
                    {formatCurrency(payout.seller_payout)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm bg-muted/30 rounded-lg">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No completed payouts yet
            </div>
          )}
        </div>

        {/* Stripe Dashboard Link */}
        {onOpenStripeDashboard && (
          <div className="p-4 pt-0">
            <Button 
              variant="outline" 
              className="w-full group hover:bg-[#635bff]/5 hover:border-[#635bff]/30"
              onClick={onOpenStripeDashboard}
              disabled={isOpeningDashboard}
            >
              {isOpeningDashboard ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <StripeLogo size="sm" className="mr-2" />
              )}
              View Full Payout History
              <ArrowRight className="h-4 w-4 ml-auto group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
